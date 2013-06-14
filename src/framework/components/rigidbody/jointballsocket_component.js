pc.extend(pc.fw, function () {
    /**
     * @component
     * @name pc.fw.JointBallSocketComponent
     * @constructor Create a new JointBallSocketComponent
     * @class A ball-socket joint limits translation such that the local pivot points of two rigid bodies
     * match in world space. A chain of rigidbodies can be connected using this constraint. 
     * @param {pc.fw.JointBallSocketComponentSystem} system The ComponentSystem that created this Component
     * @param {pc.fw.Entity} entity The Entity that this Component is attached to.     
     * @property {pc.math.vec3} pivotA The local space coordinate that constrains the entity's rigid body.
     * @extends pc.fw.Component
     */
    var JointBallSocketComponent = function JointBallSocketComponent (system, entity) {
        this.on('set_pivotA', this.onSetPivotA, this);
    };
    JointBallSocketComponent = pc.inherits(JointBallSocketComponent, pc.fw.Component);
    
    pc.extend(JointBallSocketComponent.prototype, {

        onSetPivotA: function (name, oldValue, newValue) {
            if (this.entity.rigidbody) {
                if (typeof(Ammo) !== 'undefined') {
                    var pivotA = this.data.pivotA;
                    var btPivotA = new Ammo.btVector3(pivotA[0], pivotA[1], pivotA[2]);
                    var body = this.entity.rigidbody.body;
                    this.data.constraint = new Ammo.btPoint2PointConstraint(body, btPivotA);
                    pc.fw.RigidBodyComponentSystem.addConstraint(this.data.constraint);
                } else {
                    this.data.constraint = undefined;
                }
            }
        }
    });

    return {
        JointBallSocketComponent: JointBallSocketComponent
    };
}());