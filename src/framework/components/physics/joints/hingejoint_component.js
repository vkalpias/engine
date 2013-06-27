pc.extend(pc.fw, function () {

    var SIMDSQRT12 = 0.7071067811865475244008443621048490;
    var FLT_EPSILON = 0.0000001192092896; /* smallest such that 1.0+FLT_EPSILON != 1.0 */

    var btPlaneSpace1 = function (n, p, q) {
        if (Math.abs(n[2]) > SIMDSQRT12) {
            // choose p in y-z plane
            var a = n[1]*n[1] + n[2]*n[2];
            var k = btRecipSqrt (a);
            p[0] = 0;
            p[1] = -n[2]*k;
            p[2] = n[1]*k;
            // set q = n x p
            q[0] = a*k;
            q[1] = -n[0]*p[2];
            q[2] = n[0]*p[1];
        } else {
            // choose p in x-y plane
            var a = n[0]*n[0] + n[1]*n[1];
            var k = 1 / Math.sqrt(a);
            p[0] = -n[1]*k;
            p[1] = n[0]*k;
            p[2] = 0;
            // set q = n x p
            q[0] = -n[2]*p[1];
            q[1] = n[2]*p[0];
            q[2] = a*k;
        }
    };

    var shortestArcQuat = function (v0, v1) { // Game Programming Gems 2.10. make sure v0,v1 are normalized
        var c = v0.cross(v1);
        var d = v0.dot(v1);

        if (d < -1.0 + SIMD_EPSILON) {
            btVector3 n, unused;
            btPlaneSpace1(v0,n, unused);
            return new Ammo.btQuaternion(n.x(), n.y(), n.z(), 0.0); // just pick any vector that is orthogonal to v0
        }

        var s = Math.sqrt((1.0 + d) * 2.0);
        var rs = 1.0 / s;

        return new Ammo.btQuaternion(c.getX()*rs, c.getY()*rs, c.getZ()*rs, s * 0.5);
    }

    var quatRotate = function (rotation, v) {
        var q = rotation.op_mul(v);
        q = q.op_mul(rotation.inverse());
        return new Ammo.btVector3(q.getX(), q.getY(), q.getZ());
    }

    /**
     * @component
     * @name pc.fw.HingeJointComponent
     * @constructor Create a new HingeJointComponent
     * @class A ball-socket joint limits translation such that the local pivot points of two rigid bodies
     * match in world space. A chain of rigidbodies can be connected using this constraint. 
     * @param {pc.fw.HingeJointComponentSystem} system The ComponentSystem that created this Component
     * @param {pc.fw.Entity} entity The Entity that this Component is attached to.     
     * @property {pc.math.vec3} pivot The position of the pivot in the local space of the entity.
     * @property {pc.math.vec3} axis The local space axis of rotation.
     * @extends pc.fw.Component
     */
    var HingeJointComponent = function HingeJointComponent (system, entity) {
        this.on('set_pivot', this.onSetPivot, this);
        this.on('set_axis', this.onSetAxis, this);
    };
    HingeJointComponent = pc.inherits(HingeJointComponent, pc.fw.Component);
    
    pc.extend(HingeJointComponent.prototype, {
        updateFrames: function () {
            var pivot = this.data.pivot;
            var axis = this.data.axis;
            var constraint = this.data.constraint;
            var rbA = this.entity.rigidbody.body;

            var pivotInA = new Ammo.btVector3(pivot[0], pivot[1], pivot[2]);
            var axisInA = new Ammo.btVector3(axis[0], axis[1], axis[2]);

            var p = [];
            var q = [];
            btPlaneSpace1(axis, p, q);
            var rbAxisA1 = new Ammo.btVector3(p[0], p[1], p[2]);
            var rbAxisA2 = new Ammo.btVector3(q[0], q[1], q[2]);

            var frameA = constraint.getAFrame();
            frameA.getOrigin().setValue(pivot[0], pivot[1], pivot[2]);
            frameA.getBasis().setValue(rbAxisA1.getX(), rbAxisA2.getX(), axisInA.getX(),
                                       rbAxisA1.getY(), rbAxisA2.getY(), axisInA.getY(),
                                       rbAxisA1.getZ(), rbAxisA2.getZ(), axisInA.getZ());

            var axisInB = rbA.getCenterOfMassTransform().getBasis().op_mul(axisInA);

            var rotationArc = shortestArcQuat(axisInA, axisInB);
            var rbAxisB1 =  quatRotate(rotationArc, rbAxisA1);
            var rbAxisB2 = axisInB.cross(rbAxisB1);

            var pivotIn = rbA.getCenterOfMassTransform().op_mul(pivotInA);
            var frameB = constraint.getBFrame();
            frameB.getOrigin().setValue(pivotInB.getX(), pivotInB.getY(), pivotInB.getZ());
            frameB.getBasis().setValue(rbAxisB1.getX(), rbAxisB2.getX(), axisInB.getX(),
                                       rbAxisB1.getY(), rbAxisB2.getY(), axisInB.getY(),
                                       rbAxisB1.getZ(), rbAxisB2.getZ(), axisInB.getZ());

            constraint.setFrames(frameA, frameB);
        },

        onSetPivot: function (name, oldValue, newValue) {
            if (typeof(Ammo) !== 'undefined') {
                if (this.data.constraint) {
                    this.updateFrames();
                }
            }
        },

        onSetAxis: function (name, oldValue, newValue) {
            if (typeof(Ammo) !== 'undefined') {
                if (this.data.constraint) {
                    var axisInA = new Ammo.btVector3(newValue[0], newValue[1], newValue[2]);
                    this.data.constraint.setAxis(axisInA);
                }
            }
        }
    });

    return {
        HingeJointComponent: HingeJointComponent
    };
}());