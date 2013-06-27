pc.extend(pc.fw, function () {
    /**
     * @name pc.fw.HingeJointComponentSystem
     * @constructor Create a new HingeJointComponentSystem
     * @class Manages creation of HingeJointComponents
     * @param {pc.fw.ApplicationContext} context The ApplicationContext for the running application
     * @extends pc.fw.ComponentSystem
     */
    var HingeJointComponentSystem = function HingeJointComponentSystem(context) {
        this.id = "hingejoint";
        context.systems.add(this.id, this);

        this.ComponentType = pc.fw.HingeJointComponent;
        this.DataType = pc.fw.HingeJointComponentData;

        this.schema = [{
            name: "pivot",
            displayName: "Pivot",
            description: "Local space pivot",
            type: "vector",
            options: {
                min: 0,
                step: 0.1
            },
            defaultValue: [0, 0, 0]
        }, {
            name: "axis",
            displayName: "Axis",
            description: "Local space axis of rotation",
            type: "vector",
            options: {
                min: 0,
                step: 0.1
            },
            defaultValue: [0, 1, 0]
        }, {
            name: "constraint",
            exposed: false
        }];

        // Hide this component from Designer for the time being.
        // this.exposeProperties();

        this.debugRender = false;

        this.on('remove', this.onRemove, this);

        pc.fw.ComponentSystem.on('update', this.onUpdate, this);
        pc.fw.ComponentSystem.on('toolsUpdate', this.onToolsUpdate, this);
    };
    HingeJointComponentSystem = pc.inherits(HingeJointComponentSystem, pc.fw.ComponentSystem);
    
    HingeJointComponentSystem.prototype = pc.extend(HingeJointComponentSystem.prototype, {
        initializeComponentData: function (component, data, properties) {
            if (typeof(Ammo) !== 'undefined') {
                if (component.entity.rigidbody) {
                    var pivotInA = new Ammo.btVector3(data.pivot[0], data.pivot[1], data.pivot[2]);
                    var axisInA = new Ammo.btVector3(data.axis[0], data.axis[1], data.axis[2]);
                    var body = component.entity.rigidbody.body;
                    data.constraint = new Ammo.btHingeConstraint(body, pivotInA, axisInA);

                    var context = this.context;
                    context.systems.rigidbody.addConstraint(data.constraint);
                }
            }

            properties = ['constraint', 'pivot', 'axis'];

            HingeJointComponentSystem._super.initializeComponentData.call(this, component, data, properties);
        },

        cloneComponent: function (entity, clone) {
            // overridden to make sure pivotA is duplicated
            var src = this.dataStore[entity.getGuid()];
            var data = {
                pivot: pc.extend([], src.data.pivot),
                axis: pc.extend([], src.data.axis)
            };
            return this.addComponent(clone, data);
        },
        
        onRemove: function (entity, data) {
            if (data.constraint) {
                this.context.systems.rigidbody.removeConstraint(data.constraint);
            }
        },

        /**
        * @function
        * @name pc.fw.HingeJointComponentSystem#setDebugRender
        * @description Display debug representation of the joint
        * @param {Boolean} value Enable or disable
        */
        setDebugRender: function (value) {
            this.debugRender = value;
        },

        onUpdate: function (dt) {
            if (this.debugRender) {
                this.updateDebugShapes();
            }
        },

        onToolsUpdate: function (dt) {
            this.updateDebugShapes();
        },

        updateDebugShapes: function () {
            var components = this.store;
            for (var id in components) {
                var entity = components[id].entity;
                var data = components[id].data;
            }
        }
    });

    return {
        HingeJointComponentSystem: HingeJointComponentSystem
    };
}());