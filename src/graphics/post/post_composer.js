pc.extend(pc.gfx, function () {
    // Full screen quad rendering
    var quadPrimitive = {
        type: pc.gfx.PrimType.TRIANGLE_STRIP,
        base: 0,
        count: 4,
        indexed: false
    };
    var quadState = {
        depthTest: false,
        depthWrite: false
    };

    /**
     * @name pc.gfx.EffectComposer
     * @class A post effect composer.
     */
    var EffectComposer = function () {
        // Create the vertex format
        var vertexFormat = new pc.gfx.VertexFormat();
        vertexFormat.begin();
        vertexFormat.addElement(new pc.gfx.VertexElement("aPosition", 2, pc.gfx.VertexElementType.FLOAT32));
        vertexFormat.end();

        // Create a vertex buffer
        this.vertexBuffer = new pc.gfx.VertexBuffer(vertexFormat, 4);

        // Fill the vertex buffer
        var iterator = new pc.gfx.VertexIterator(this.vertexBuffer);
        iterator.element.aPosition.set(-1.0, -1.0);
        iterator.next();
        iterator.element.aPosition.set(1.0, -1.0);
        iterator.next();
        iterator.element.aPosition.set(-1.0, 1.0);
        iterator.next();
        iterator.element.aPosition.set(1.0, 1.0);
        iterator.end();

        this.effects = [];
        this.device = pc.gfx.Device.getCurrent();

        this.srcTarget = null;
        this.dstTarget = null;
    }

    EffectComposer.prototype = {
        setInput: function (target) {
            var srcBuffer = target.getFrameBuffer();
            var dstBuffer = new pc.gfx.FrameBuffer(srcBuffer.getWidth(), srcBuffer.getHeight(), false, false);
            var dstTarget = new pc.gfx.RenderTarget(dstBuffer);

            this.srcTarget = target;
            this.dstTarget = dstTarget;
        },

        drawFullscreenQuad: function (target, program) {
            var device = this.device;
            device.setRenderTarget(target);
            device.updateBegin();
            device.updateLocalState(quadState);
            device.setVertexBuffer(this.vertexBuffer, 0);
            device.setProgram(program);
            device.draw(quadPrimitive);
            device.clearLocalState();
            device.updateEnd();
        },

        addEffect: function (effect) {
            this.effects.push(effect);
        },

        render: function () {
            for (var i = 0; i < this.effects.length; i++) {
                this.effects[i].render();

                // Swap the targets around
                var tmp = this.srcTarget;
                this.srcTarget = this.dstTarget;
                this.dstTarget = tmp;
            }
        }
    }

    return {
        EffectComposer: EffectComposer
    }; 
}());