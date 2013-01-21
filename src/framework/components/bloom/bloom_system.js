pc.extend(pc.fw, function () {

    /**
     * @name pc.fw.BloomComponentSystem
     * @constructor Create a new BloomComponent
     * @class Applies a bloom filter to a render target, writing the result to the backbuffer.
     * @param {pc.fw.ApplicationContext} context
     * @extends pc.fw.ComponentSystem
     */
    var BloomComponentSystem = function BloomComponentSystem (context) {
        this.id = "bloom";
        context.systems.add(this.id, this);

        this.ComponentType = pc.fw.BloomComponent;
        this.DataType = pc.fw.BloomComponentData;

        this.schema = [{
         name: "bloomThreshold",
         displayName: "Bloom Threshold",
            description: "The luminance threshold above which blooming is applied",
            type: "number",
            options: {
                max: 1,
                min: 0,
                step: 0.05
            },
            defaultValue: 0.25
        }, {
         name: "blurAmount",
         displayName: "Blur Amount",
            description: "The luminance threshold above which blooming is applied",
            type: "number",
            options: {
                max: 10,
                min: 1,
                step: 0.5
            },
            defaultValue: 4
        }, { 
         name: "bloomIntensity",
         displayName: "Bloom Intensity",
         description: "TBD",
            type: "number",
            options: {
                max: 3,
                min: 0,
                step: 0.05
            },
            defaultValue: 1.25
        }, {
         name: "baseIntensity",
         displayName: "Base Intensity",
         description: "TBD",
            type: "number",
            options: {
                max: 3,
                min: 0,
                step: 0.05
            },
            defaultValue: 1
        }, {
         name: "bloomSaturation",
         displayName: "Bloom Saturation",
         description: "TBD",
            type: "number",
            options: {
                max: 3,
                min: 0,
                step: 0.05
            },
            defaultValue: 1
        }, {
         name: "baseSaturation",
         displayName: "Base Saturation",
         description: "TBD",
            type: "number",
            options: {
                max: 3,
                min: 0,
                step: 0.05
            },
            defaultValue: 1
        }];
        this.exposeProperties();

        this.on('remove', this.onRemove, this);
    }
    BloomComponentSystem = pc.inherits(BloomComponentSystem, pc.fw.ComponentSystem);
    
    pc.extend(BloomComponentSystem.prototype, {
        initializeComponentData: function (component, data, properties) {
            data = data || {};
            data.effect = new pc.gfx.BloomEffect();

            if (component.entity.camera) {
                component.entity.camera.addEffect(data.effect);
            }

            BloomComponentSystem._super.initializeComponentData.call(this, component, data, ['bloomThreshold', 'blurAmount', 'bloomIntensity', 'baseIntensity', 'bloomSaturation', 'baseSaturation']);
        },

        onRemove: function (entity, data) {
            if (entity.camera) {
                entity.camera.removeEffect(data.effect);
            }
        }
    });
    
    return {
        BloomComponentSystem: BloomComponentSystem
    }
}());