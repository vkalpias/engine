function unpack565(packed, packedIndex, color) {
    // build the packed value
    var value = packed[packedIndex + 0] | ( packed[packedIndex + 1] << 8 );

    // get the components in the stored range
    var red = ( ( value >> 11 ) & 0x1f );
    var green = ( ( value >> 5 ) & 0x3f );
    var blue = ( value & 0x1f );

    // scale up to 8 bits
    color[0] = ( red << 3 ) | ( red >> 2 );
    color[1] = ( green << 2 ) | ( green >> 4 );
    color[2] = ( blue << 3 ) | ( blue >> 2 );
    color[3] = 255;

    // return the value
    return value;
}

var codes = [
    new Uint8Array(4),
    new Uint8Array(4),
    new Uint8Array(4),
    new Uint8Array(4)
];

function decompressColor(rgba, blocks, blockIndex, isDxt1) {
    // unpack the endpoints
    var a = unpack565(blocks, blockIndex, codes[0]);
    var b = unpack565(blocks, blockIndex + 2, codes[1]);

    // generate the midpoints
    for (var i = 0; i < 3; ++i) {
        var c = codes[0][i];
        var d = codes[1][i];

        if (isDxt1 && a <= b) {
            codes[2][i] = Math.floor((c + d) * 0.5);
            codes[3][i] = 0;
        } else {
            codes[2][i] = Math.floor((2*c + d )/3);
            codes[3][i] = Math.floor((c + 2*d )/3);
        }
    }
    
    // fill in alpha for the intermediate values
    codes[2][3] = 255;
    codes[3][3] = ( isDxt1 && a <= b ) ? 0 : 255;
    
    // unpack the indices
    var indices = [];
    for (var i = 0; i < 4; ++i) {
        var packed = blocks[blockIndex + 4 + i];

        indices[0 + 4*i] = packed & 0x3;
        indices[1 + 4*i] = ( packed >> 2 ) & 0x3;
        indices[2 + 4*i] = ( packed >> 4 ) & 0x3;
        indices[3 + 4*i] = ( packed >> 6 ) & 0x3;
    }

    // store out the colours
    for (var i = 0; i < 16; ++i) {
        var offset = 4 * indices[i];
        for (var j = 0; j < 4; ++j)
            rgba[4*i + j] = codes[offset + j];
    }
}

function decompressAlphaDxt3(rgba, block ) {
    var bytes = block;

    // unpack the alpha values pairwise
    for (var i = 0; i < 8; ++i) {
        // quantise down to 4 bits
        var quant = bytes[i];
        
        // unpack the values
        var lo = quant & 0x0f;
        var hi = quant & 0xf0;

        // convert back up to bytes
        rgba[8*i + 3] = lo | ( lo << 4 );
        rgba[8*i + 7] = hi | ( hi >> 4 );
    }
}

function decompressAlphaDxt5(rgba, block) {
    // get the two alpha values
    var bytes = block;
    var alpha0 = bytes[0];
    var alpha1 = bytes[1];
    
    // compare the values to build the codebook
    var codes = [];
    codes[0] = alpha0;
    codes[1] = alpha1;
    if (alpha0 <= alpha1) {
        // use 5-alpha codebook
        for (var i = 1; i < 5; ++i)
            codes[1 + i] = ( u8 )( ( ( 5 - i )*alpha0 + i*alpha1 )/5 );
        codes[6] = 0;
        codes[7] = 255;
    } else {
        // use 7-alpha codebook
        for (var i = 1; i < 7; ++i)
            codes[1 + i] = ( u8 )( ( ( 7 - i )*alpha0 + i*alpha1 )/7 );
    }
    
    // decode the indices
    var indices = [];
    u8 const* src = bytes + 2;
    var cnt = 0;
    for (var i = 0; i < 2; ++i) {
        // grab 3 bytes
        var value = 0;
        for (var j = 0; j < 3; ++j) {
            int byte = *src++;
            value |= ( byte << 8*j );
        }
        
        // unpack 8 3-bit values from it
        for (var j = 0; j < 8; ++j ) {
            var index = ( value >> 3*j ) & 0x7;
            indices[cnt++] = index;
        }
    }
    
    // write out the indexed codebook values
    for (var i = 0; i < 16; ++i)
        rgba[4*i + 3] = codes[indices[i]];
}

function decompress(rgba, blocks, blockIndex, format) {
    // get the block locations
    var colorBlock = blockIndex;
    var alphaBock = blockIndex;
    if ((format === pc.gfx.PIXELFORMAT_DXT3) || (format === pc.gfx.PIXELFORMAT_DXT5))
        colorBlock = blockIndex + 8;

    // decompress colour
    decompressColor(rgba, blocks, colorBlock, (format === pc.gfx.PIXELFORMAT_DXT1));

    // decompress alpha separately if necessary
    if (format === pc.gfx.PIXELFORMAT_DXT3)
        decompressAlphaDxt3(rgba, alphaBock);
    else if (format === pc.gfx.PIXELFORMAT_DXT5)
        decompressAlphaDxt5(rgba, alphaBock);
}

function decompressImage(rgba, width, height, blocks, format) {
    // initialise the block input
    var blockIndex = 0;
    var bytesPerBlock = (format === pc.gfx.PIXELFORMAT_DXT1) ? 8 : 16;
    var targetRgba = new Uint8Array(4*16);

    // loop over blocks
    for (var y = 0; y < height; y += 4) {
        for (var x = 0; x < width; x += 4) {
            // decompress the block
            decompress(targetRgba, blocks, blockIndex, format);

            // write the decompressed pixels to the correct image locations
            var sourcePixel = 0;
            for (var py = 0; py < 4; ++py) {
                for (var px = 0; px < 4; ++px) {
                    // get the target location
                    var sx = x + px;
                    var sy = y + py;
                    if (sx < width && sy < height) {
                        var targetPixel = 4 * (width*sy + sx);
                        
                        // copy the rgba value
                        for (var i = 0; i < 4; ++i) {
                            rgba[targetPixel++] = targetRgba[sourcePixel++];
                        }
                    } else {
                        // skip this pixel as its outside the image
                        sourcePixel += 4;
                    }
                }
            }
            
            // advance
            blockIndex += bytesPerBlock;
        }
    }
}

function loadLevels(texture, ddsData) {
    var DDS_MAGIC = 0x20534444;

    var DDSD_CAPS = 0x1,
        DDSD_HEIGHT = 0x2,
        DDSD_WIDTH = 0x4,
        DDSD_PITCH = 0x8,
        DDSD_PIXELFORMAT = 0x1000,
        DDSD_MIPMAPCOUNT = 0x20000,
        DDSD_LINEARSIZE = 0x80000,
        DDSD_DEPTH = 0x800000;

    var DDSCAPS_COMPLEX = 0x8,
        DDSCAPS_MIPMAP = 0x400000,
        DDSCAPS_TEXTURE = 0x1000;
        
    var DDSCAPS2_CUBEMAP = 0x200,
        DDSCAPS2_CUBEMAP_POSITIVEX = 0x400,
        DDSCAPS2_CUBEMAP_NEGATIVEX = 0x800,
        DDSCAPS2_CUBEMAP_POSITIVEY = 0x1000,
        DDSCAPS2_CUBEMAP_NEGATIVEY = 0x2000,
        DDSCAPS2_CUBEMAP_POSITIVEZ = 0x4000,
        DDSCAPS2_CUBEMAP_NEGATIVEZ = 0x8000,
        DDSCAPS2_VOLUME = 0x200000;

    var DDPF_ALPHAPIXELS = 0x1,
        DDPF_ALPHA = 0x2,
        DDPF_FOURCC = 0x4,
        DDPF_RGB = 0x40,
        DDPF_YUV = 0x200,
        DDPF_LUMINANCE = 0x20000;

    function fourCCToInt32(value) {
        return value.charCodeAt(0) +
            (value.charCodeAt(1) << 8) +
            (value.charCodeAt(2) << 16) +
            (value.charCodeAt(3) << 24);
    }

    function int32ToFourCC(value) {
        return String.fromCharCode(
            value & 0xff,
            (value >> 8) & 0xff,
            (value >> 16) & 0xff,
            (value >> 24) & 0xff
        );
    }

    var FOURCC_DXT1 = fourCCToInt32("DXT1");
    var FOURCC_DXT3 = fourCCToInt32("DXT3");
    var FOURCC_DXT5 = fourCCToInt32("DXT5");

    var headerLengthInt = 31; // The header length in 32 bit ints

    // Offsets into the header array
    var off_magic = 0;

    var off_size = 1;
    var off_flags = 2;
    var off_height = 3;
    var off_width = 4;

    var off_mipmapCount = 7;

    var off_pfFlags = 20;
    var off_pfFourCC = 21;

    var header = new Int32Array(ddsData, 0, headerLengthInt);

    var w = header[off_width];
    var h = header[off_height];

    texture.autoMipmap = false;
    texture._format = pc.gfx.PIXELFORMAT_DXT1;
    var ext = pc.gfx.Device.getCurrent().extCompressedTextureS3TC;
    texture._glFormat = gl.RGB;
    texture._glInternalFormat = ext.COMPRESSED_RGB_S3TC_DXT1_EXT;
    texture._compressed = true;
    texture._width = w;
    texture._height = h;

    var pixels = texture.lock();

    var dataOffset = header[off_size] + 4;
    var blocks = new Uint8Array(ddsData, dataOffset, pixels.length);
    pixels.set(blocks);

    texture.unlock();
}