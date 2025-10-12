import * as THREE from 'three';
import { makeArmDownQuaternion } from './utils.js';

/**
 * Creates an idle animation.
 * @param {THREE.Skeleton} skeleton - The skeleton to animate.
 * @param {THREE.Vector3} hipPos - The initial local position of the hip bone.
 * @param {Map<string, THREE.Vector3>} markerPositions - A map of bone names to their local positions.
 * @returns {THREE.AnimationClip|null}
 */
export function createIdleAnimation(skeleton, hipPos, markerPositions) {
    const hips = skeleton.getBoneByName('hips');
    const spine = skeleton.getBoneByName('spine');
    const shoulderL = skeleton.getBoneByName('left_shoulder');
    const shoulderR = skeleton.getBoneByName('right_shoulder');
    const elbowL = skeleton.getBoneByName('left_elbow');
    const elbowR = skeleton.getBoneByName('right_elbow');
    const kneeL = skeleton.getBoneByName('left_knee');
    const kneeR = skeleton.getBoneByName('right_knee');

    if (!hips || !spine || !shoulderL || !shoulderR || !kneeL || !kneeR) return null;

    const idleTimes = [0, 1, 2, 3, 4];
    const interpolation = THREE.InterpolateSmooth;
    const tracks = [];

    // Calculate character proportions for dynamic arm positioning
    const leftHipPos = markerPositions.get('left_hip');
    const rightHipPos = markerPositions.get('right_hip');
    const leftShoulderPos = markerPositions.get('left_shoulder');
    const rightShoulderPos = markerPositions.get('right_shoulder');
    const leftElbowPos = markerPositions.get('left_elbow');
    
    const hipWidth = leftHipPos.distanceTo(rightHipPos);
    const shoulderWidth = leftShoulderPos.distanceTo(rightShoulderPos);
    const avgBodyWidth = (hipWidth + shoulderWidth) / 2;
    const armLength = leftShoulderPos.distanceTo(leftElbowPos);
    const bodyToArmRatio = avgBodyWidth / armLength;
    
    // Dynamic arm abduction for idle pose
    const baseArmAbduction = Math.PI / 24; // Base ~7.5 degrees for idle (less than walk)
    const dynamicArmAbduction = baseArmAbduction * (1 + bodyToArmRatio * 1.2);
    const armAbduction = THREE.MathUtils.clamp(dynamicArmAbduction, Math.PI / 20, Math.PI / 8);

    // Compute base "arms down" orientation from T-pose using marker directions
    const qDownL = makeArmDownQuaternion(markerPositions, 'left_shoulder', 'left_elbow');
    const qDownR = makeArmDownQuaternion(markerPositions, 'right_shoulder', 'right_elbow');

    // Apply abduction to keep arms away from body
    const qAbductL = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -armAbduction));
    const qAbductR = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, armAbduction));
    
    // Slight forward tilt for natural resting position
    const forwardTilt = Math.PI / 36; // ~5 degrees forward
    const qForwardTiltL = new THREE.Quaternion().setFromEuler(new THREE.Euler(forwardTilt, 0, 0));
    const qForwardTiltR = new THREE.Quaternion().setFromEuler(new THREE.Euler(forwardTilt, 0, 0));
    
    // Combine: forward tilt + abduction + down orientation
    const qDownAbductedL = qForwardTiltL.clone().multiply(qAbductL).multiply(qDownL);
    const qDownAbductedR = qForwardTiltR.clone().multiply(qAbductR).multiply(qDownR);

    // Subtle arm sway around Z while keeping them down and away from body
    const armSwayAngle = Math.PI / 36; // ~5 degrees
    const qSwayL_Pos = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, +armSwayAngle));
    const qSwayL_Neg = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -armSwayAngle));
    const qSwayR_Pos = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, +armSwayAngle));
    const qSwayR_Neg = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -armSwayAngle));

    // Compose: sway * down to keep sway relative to the "arms-down-abducted" base orientation
    const qL0 = qDownAbductedL.clone();
    const qL1 = qSwayL_Pos.clone().multiply(qDownAbductedL);
    const qL2 = qDownAbductedL.clone();
    const qL3 = qSwayL_Neg.clone().multiply(qDownAbductedL);
    const qL4 = qDownAbductedL.clone();

    tracks.push(new THREE.QuaternionKeyframeTrack(`${shoulderL.name}.quaternion`, idleTimes, [
        ...qL0.toArray(), ...qL1.toArray(), ...qL2.toArray(), ...qL3.toArray(), ...qL4.toArray()
    ], interpolation));

    const qR0 = qDownAbductedR.clone();
    const qR1 = qSwayR_Neg.clone().multiply(qDownAbductedR);
    const qR2 = qDownAbductedR.clone();
    const qR3 = qSwayR_Pos.clone().multiply(qDownAbductedR);
    const qR4 = qDownAbductedR.clone();

    tracks.push(new THREE.QuaternionKeyframeTrack(`${shoulderR.name}.quaternion`, idleTimes, [
        ...qR0.toArray(), ...qR1.toArray(), ...qR2.toArray(), ...qR3.toArray(), ...qR4.toArray()
    ], interpolation));

    // Body sway: hips translate slightly left-right, spine counter-rotates to keep upper stable
    const swayAmount = 0.01; // meters
    const initialHipPos = hipPos.clone();
    tracks.push(new THREE.VectorKeyframeTrack(`${hips.name}.position`, idleTimes, [
        initialHipPos.x, initialHipPos.y, initialHipPos.z,
        initialHipPos.x + swayAmount, initialHipPos.y, initialHipPos.z,
        initialHipPos.x, initialHipPos.y, initialHipPos.z,
        initialHipPos.x - swayAmount, initialHipPos.y, initialHipPos.z,
        initialHipPos.x, initialHipPos.y, initialHipPos.z,
    ], interpolation));

    const spineSwayAngle = -swayAmount / 0.2;
    const qSpine_Base = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
    const qSpine_L = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, spineSwayAngle));
    const qSpine_R = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -spineSwayAngle));
    tracks.push(new THREE.QuaternionKeyframeTrack(`${spine.name}.quaternion`, idleTimes, [
        ...qSpine_Base.toArray(), ...qSpine_L.toArray(), ...qSpine_Base.toArray(), ...qSpine_R.toArray(), ...qSpine_Base.toArray()
    ], interpolation));

    // Light knee bends alternating
    const kneeBendAngle = Math.PI / 30; // ~6 degrees
    const qKnee_Base = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
    const qKnee_Bent = new THREE.Quaternion().setFromEuler(new THREE.Euler(kneeBendAngle, 0, 0));
    tracks.push(new THREE.QuaternionKeyframeTrack(`${kneeR.name}.quaternion`, idleTimes, [
        ...qKnee_Base.toArray(), ...qKnee_Bent.toArray(), ...qKnee_Base.toArray(), ...qKnee_Base.toArray(), ...qKnee_Base.toArray()
    ], interpolation));
    tracks.push(new THREE.QuaternionKeyframeTrack(`${kneeL.name}.quaternion`, idleTimes, [
        ...qKnee_Base.toArray(), ...qKnee_Base.toArray(), ...qKnee_Base.toArray(), ...qKnee_Bent.toArray(), ...qKnee_Base.toArray()
    ], interpolation));

    // Slight elbow bend so arms look natural at sides - scale with body proportions
    const elbowBendAngle = Math.PI / 16 * (1 + bodyToArmRatio * 0.3);
    
    if (elbowL) {
        const qElbowL_Base = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, elbowBendAngle, 0));
        tracks.push(new THREE.QuaternionKeyframeTrack(`${elbowL.name}.quaternion`, idleTimes, [
            ...qElbowL_Base.toArray(), ...qElbowL_Base.toArray(), ...qElbowL_Base.toArray(), ...qElbowL_Base.toArray(), ...qElbowL_Base.toArray()
        ], interpolation));
    }
    if (elbowR) {
        const qElbowR_Base = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -elbowBendAngle, 0));
        tracks.push(new THREE.QuaternionKeyframeTrack(`${elbowR.name}.quaternion`, idleTimes, [
            ...qElbowR_Base.toArray(), ...qElbowR_Base.toArray(), ...qElbowR_Base.toArray(), ...qElbowR_Base.toArray(), ...qElbowR_Base.toArray()
        ], interpolation));
    }

    return new THREE.AnimationClip('idle', -1, tracks);
}