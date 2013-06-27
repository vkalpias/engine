pc.extend(pc.fw, function () {

    /**
     * @private
     * @name pc.fw.HingeJointComponentData
     * @constructor Create a new HingeJointComponentData
     * @class Data definition for ball-socket joints.
     * @extends pc.fw.ComponentData
     */
    var HingeJointComponentData = function () {
        this.pivot = [0, 0, 0];
        this.axis = [0, 1, 0];

        // Non-serialized properties
        this.constraint = null;
    };
    HingeJointComponentData = pc.inherits(HingeJointComponentData, pc.fw.ComponentData);

    return {
        HingeJointComponentData: HingeJointComponentData
    };
}());