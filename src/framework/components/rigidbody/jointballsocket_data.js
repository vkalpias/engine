pc.extend(pc.fw, function () {

    /**
     * @private
     * @name pc.fw.JointBallSocketComponentData
     * @constructor Create a new JointBallSocketComponentData
     * @class Data definition for ball-socket joints.
     * @extends pc.fw.ComponentData
     */
    var JointBallSocketComponentData = function () {
        this.pivotA = [0, 0, 0];
        this.pivotB = [0, 0, 0];
        this.tau = 0.3;
        this.damping = 1;
        this.impulseClamp = 0;

        // Non-serialized properties
        this.constraint = null;
    };
    JointBallSocketComponentData = pc.inherits(JointBallSocketComponentData, pc.fw.ComponentData);

    return {
        JointBallSocketComponentData: JointBallSocketComponentData
    };
}());