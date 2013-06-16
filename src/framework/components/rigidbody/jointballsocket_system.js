pc.extend(pc.fw, function () {
    /**
     * @name pc.fw.JointBallSocketComponentSystem
     * @constructor Create a new JointBallSocketComponentSystem
     * @class Manages creation of CollisionBoxComponents
     * @param {pc.fw.ApplicationContext} context The ApplicationContext for the running application
     * @extends pc.fw.ComponentSystem
     */
    var JointBallSocketComponentSystem = function JointBallSocketComponentSystem (context) {
        this.id = "jointballsocket";
        context.systems.add(this.id, this);

        this.ComponentType = pc.fw.JointBallSocketComponent;
        this.DataType = pc.fw.JointBallSocketComponentData;

        this.schema = [{
            name: "pivotA",
            displayName: "Pivot A",
            description: "Local pivot A",
            type: "vector",
            options: {
                min: 0,
                step: 0.1
            },
            defaultValue: [0, 0, 0]
        }, {
            name: "constraint",
            exposed: false
        }];

        this.exposeProperties();

        this.debugRender = false;

        this.on('remove', this.onRemove, this);

        pc.fw.ComponentSystem.on('update', this.onUpdate, this);
        pc.fw.ComponentSystem.on('toolsUpdate', this.onToolsUpdate, this);
    };
    JointBallSocketComponentSystem = pc.inherits(JointBallSocketComponentSystem, pc.fw.ComponentSystem);
    
    JointBallSocketComponentSystem.prototype = pc.extend(JointBallSocketComponentSystem.prototype, {
        initializeComponentData: function (component, data, properties) {
            if (typeof(Ammo) !== 'undefined') {
                if (component.entity.rigidbody) {
                    var pivotA = data.pivotA;
                    var btPivotA = new Ammo.btVector3(pivotA[0], pivotA[1], pivotA[2]);
                    var body = component.entity.rigidbody.body;
                    data.constraint = new Ammo.btPoint2PointConstraint(body, btPivotA);

                    var context = this.context;
                    context.systems.rigidbody.addConstraint(data.constraint);
                }
            }

            properties = ['constraint', 'pivotA'];

            JointBallSocketComponentSystem._super.initializeComponentData.call(this, component, data, properties);
        },

        cloneComponent: function (entity, clone) {
            // overridden to make sure pivotA is duplicated
            var src = this.dataStore[entity.getGuid()];
            var data = {
                pivotA: pc.extend([], src.data.pivotA)
            };
            return this.addComponent(clone, data);
        },
        
        onRemove: function (entity, data) {
            if (entity.rigidbody && entity.rigidbody.body) {
                this.context.systems.rigidbody.removeBody(entity.rigidbody.body);
            }
        },

        /**
        * @function
        * @name pc.fw.JointBallSocketComponentSystem#setDebugRender
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
        JointBallSocketComponentSystem: JointBallSocketComponentSystem
    };
}());