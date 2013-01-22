pc.extend(pc.fw, function () {
    /**
     * @name pc.fw.BloomComponent
     * @constructor Create a new BloomComponent
     * @class Applies a bloom filter to a render target, writing the result to the backbuffer.
     * @param {pc.fw.BloomComponentSystem} system The ComponentSystem that created this Component
     * @param {pc.fw.Entity} entity The Entity that this Component is attached to
     * @extends pc.fw.Component
     * @property {Number} bloomThreshold 
     * @property {Number} blurAmount
     * @property {Number} bloomIntensity
     * @property {Number} baseIntensity
     * @property {Number} bloomSaturation
     * @property {Number} baseSaturation
     */
    var BloomComponent = function BloomComponent (system, entity) {
        entity.on('addcomponent', this.onAddComponent, this);
        entity.on('removecomponent', this.onRemoveComponent, this);

        this.on("set_bloomThreshold", this.onSetBloomThreshold, this);
        this.on("set_blurAmount", this.onSetBlurAmount, this);
        this.on("set_bloomIntensity", this.onSetBloomIntensity, this);
        this.on("set_baseIntensity", this.onSetBaseIntensity, this);
        this.on("set_bloomSaturation", this.onSetBloomSaturation, this);
        this.on("set_baseSaturation", this.onSetBaseSaturation, this);
    };
    BloomComponent = pc.inherits(BloomComponent, pc.fw.Component);

    pc.extend(BloomComponent.prototype, {
        addComponent: function (component) {
            if (component instanceof pc.fw.CameraComponent) {
                component.addEffect(this.data.effect);
            }
        },

        removeComponent: function (component) {
            if (component instanceof pc.fw.CameraComponent) {
                component.addEffect(this.data.effect);
            }
        },

        onSetBloomThreshold: function (name, oldValue, newValue) {
            this.data.pass.bloomThreshold = newValue;
        },

        onSetBlurAmount: function (name, oldValue, newValue) {
            this.data.pass.blurAmount = newValue;
        },

        onSetBloomIntensity: function (name, oldValue, newValue) {
            this.data.pass.bloomIntensity = newValue;
        },

        onSetBaseIntensity: function (name, oldValue, newValue) {
            this.data.pass.baseIntensity = newValue;
        },

        onSetBloomSaturation: function (name, oldValue, newValue) {
            this.data.pass.bloomSaturation = newValue;
        },

        onSetBaseSaturation: function (name, oldValue, newValue) {
            this.data.pass.baseSaturation = newValue;
        }
    });

    return {
        BloomComponent: BloomComponent
    };
}());