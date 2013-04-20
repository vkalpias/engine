pc.extend(pc.resources, function () {
    function arrayBufferCopy(src, dst, dstByteOffset, numBytes) {
        dst32Offset = dstByteOffset / 4;
        var tail = (numBytes % 4);
        var src32 = new Uint32Array(src.buffer, 0, (numBytes - tail) / 4);
        var dst32 = new Uint32Array(dst.buffer);
        for (var i = 0; i < src32.length; i++) {
            dst32[dst32Offset + i] = src32[i];
        }
        for (var i = numBytes - tail; i < numBytes; i++) {
            dst[dstByteOffset + i] = src[i];
        }
    }

    var CrunchResourceHandler = function () {
    };
    CrunchResourceHandler = pc.inherits(CrunchResourceHandler, pc.resources.ResourceHandler);

    CrunchResourceHandler.prototype.load = function (identifier, success, error, progress, options) {
        var url = identifier;
        options = options || {};
        options.directory = pc.path.getDirectory(url);

        pc.net.http.get(url, function (response) {
            success(response, options);
        }.bind(this), options);
    };

    CrunchResourceHandler.prototype.open = function (data, options) {
        // Copy loaded file into Emscripten-managed memory
        var srcSize = data.byteLength;
        var bytes = new Uint8Array(data);
        var src = Module._malloc(srcSize);
        arrayBufferCopy(bytes, Module.HEAPU8, src, srcSize);

        // Decompress CRN to DDS (minus the header)
        var dst = Module._crn_decompress_get_data(src, srcSize);
        var dstSize = Module._crn_decompress_get_size(src, srcSize);

        var ddsData = Module.HEAPU8.buffer.slice(dst, dst + dstSize);

        return ddsData;
    };

    var CrunchRequest = function CrunchRequest(identifier) {
    };
    CrunchRequest = pc.inherits(CrunchRequest, pc.resources.ResourceRequest);
    CrunchRequest.prototype.type = "crunch";

    return {
        CrunchResourceHandler: CrunchResourceHandler,
        CrunchRequest: CrunchRequest
    };
}());