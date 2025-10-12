import * as THREE from 'three';
import { makeArmDownQuaternion } from './utils.js';

/**
 * Creates a walk animation.
 * @param {THREE.Skeleton} skeleton - The skeleton to animate.
 * @param {THREE.Vector3} hipPos - The initial local position of the hip bone.
 * @param {Map<string, THREE.Vector3>} markerPositions - A map of bone names to their local positions.
 * @returns {THREE.AnimationClip|null}
 */
export function createWalkAnimation(skeleton, hipPos, markerPositions) {
    const hips = skeleton.getBoneByName('hips');
    const spine = skeleton.getBoneByName('spine');
    const shoulderL = skeleton.getBoneByName('left_shoulder');
    const shoulderR = skeleton.getBoneByName('right_shoulder');
    const elbowL = skeleton.getBoneByName('left_elbow');
    const elbowR = skeleton.getBoneByName('right_elbow');
    const hipL = skeleton.getBoneByName('left_hip');
    const hipR = skeleton.getBoneByName('right_hip');
    const kneeL = skeleton.getBoneByName('left_knee');
    const kneeR = skeleton.getBoneByName('right_knee');
    const ankleL = skeleton.getBoneByName('left_ankle');
    const ankleR = skeleton.getBoneByName('right_ankle');

    if (!hips || !spine || !shoulderL || !shoulderR || !elbowL || !elbowR || !hipL || !hipR || !kneeL || !kneeR || !ankleL || !ankleR) return null;

    // --- Dynamic Proportions Calculation ---
    const leftHipPos = markerPositions.get('left_hip');
    const rightHipPos = markerPositions.get('right_hip');
    const leftShoulderPos = markerPositions.get('left_shoulder');
    const rightShoulderPos = markerPositions.get('right_shoulder');
    const leftElbowPos = markerPositions.get('left_elbow');
    
    const hipWidth = leftHipPos.distanceTo(rightHipPos);
    const shoulderWidth = leftShoulderPos.distanceTo(rightShoulderPos);
    const armLength = leftShoulderPos.distanceTo(leftElbowPos);
    
    // Effective body width is the max of shoulders or hips, plus a buffer
    const effectiveBodyWidth = Math.max(hipWidth, shoulderWidth) * 1.1;
    
    // Calculate required abduction angle using trigonometry
    // We want the arm (hypotenuse) to clear half the body width (opposite side)
    const armAbduction = Math.asin((effectiveBodyWidth / 2) / armLength) * 1.2; // Add 20% buffer

    const walkTimes = [0, 0.25, 0.5, 0.75, 1]; // One full cycle
    const walkTracks = [];
    const interpolation = THREE.InterpolateSmooth;

    // --- Hip Movement ---
    const initialHipPos = hipPos.clone();
    const hipVertical = 0.01; // Up/down bob
    walkTracks.push(new THREE.VectorKeyframeTrack(`${hips.name}.position`, walkTimes, [
        initialHipPos.x, initialHipPos.y + hipVertical, initialHipPos.z,
        initialHipPos.x, initialHipPos.y, initialHipPos.z,
        initialHipPos.x, initialHipPos.y + hipVertical, initialHipPos.z,
        initialHipPos.x, initialHipPos.y, initialHipPos.z,
        initialHipPos.x, initialHipPos.y + hipVertical, initialHipPos.z,
    ], interpolation));

    // --- Leg Animation (based on gait cycle) ---
    const hipFlexion = Math.PI / 8; // Max forward leg swing (22.5 deg)
    const hipExtension = -Math.PI / 9; // Max backward leg swing (-20 deg)
    const kneeFlexion = Math.PI / 2.5; // Max knee bend during swing (72 deg)
    const ankleFlexion = Math.PI / 18; // Ankle bend up (10 deg)
    const ankleExtension = -Math.PI / 12; // Ankle bend down (-15 deg)
    const hipAbduction = Math.PI / 36; // Slight outward hip rotation for knee clearance

    // Correct Euler angles for forward/backward motion (around X-axis)
    const eHipForward = new THREE.Euler(hipFlexion, 0, 0);
    const eHipBack = new THREE.Euler(hipExtension, 0, 0);
    const eHipNeutral = new THREE.Euler(0, 0, 0);
    
    const eKneeStraight = new THREE.Euler(0, 0, 0);
    const eKneeBent = new THREE.Euler(kneeFlexion, 0, 0);
    const eKneeSlightlyBent = new THREE.Euler(kneeFlexion * 0.2, 0, 0);

    const eAnkleNeutral = new THREE.Euler(0, 0, 0);
    const eAnkleUp = new THREE.Euler(-ankleFlexion, 0, 0);
    const eAnkleDown = new THREE.Euler(ankleExtension, 0, 0);

    // Quaternions from Eulers
    const qHipFwd = new THREE.Quaternion().setFromEuler(eHipForward);
    const qHipBack = new THREE.Quaternion().setFromEuler(eHipBack);
    const qHipNeutral = new THREE.Quaternion().setFromEuler(eHipNeutral);
    
    // For mid-swing pose, combine forward swing with abduction (outward rotation).
    const qHipSwingL = new THREE.Quaternion().setFromEuler(new THREE.Euler(hipFlexion * 0.5, 0, hipAbduction));
    const qHipSwingR = new THREE.Quaternion().setFromEuler(new THREE.Euler(hipFlexion * 0.5, 0, -hipAbduction));

    const qKneeStraight = new THREE.Quaternion().setFromEuler(eKneeStraight);
    const qKneeBent = new THREE.Quaternion().setFromEuler(eKneeBent);
    const qKneeSlightlyBent = new THREE.Quaternion().setFromEuler(eKneeSlightlyBent);

    const qAnkleNeutral = new THREE.Quaternion().setFromEuler(eAnkleNeutral);
    const qAnkleUp = new THREE.Quaternion().setFromEuler(eAnkleUp);
    const qAnkleDown = new THREE.Quaternion().setFromEuler(eAnkleDown);

    // Left Leg Keyframes (Starts cycle with heel strike)
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${hipL.name}.quaternion`, walkTimes, [
        ...qHipFwd.toArray(), ...qHipNeutral.toArray(), ...qHipBack.toArray(), ...qHipSwingL.toArray(), ...qHipFwd.toArray()
    ], interpolation));
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${kneeL.name}.quaternion`, walkTimes, [
        ...qKneeStraight.toArray(), ...qKneeSlightlyBent.toArray(), ...qKneeSlightlyBent.toArray(), ...qKneeBent.toArray(), ...qKneeStraight.toArray()
    ], interpolation));
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${ankleL.name}.quaternion`, walkTimes, [
        ...qAnkleUp.toArray(), ...qAnkleNeutral.toArray(), ...qAnkleDown.toArray(), ...qAnkleUp.toArray(), ...qAnkleUp.toArray()
    ], interpolation));

    // Right Leg Keyframes (Offset by 0.5s from left leg)
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${hipR.name}.quaternion`, walkTimes, [
        ...qHipBack.toArray(), ...qHipSwingR.toArray(), ...qHipFwd.toArray(), ...qHipNeutral.toArray(), ...qHipBack.toArray()
    ], interpolation));
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${kneeR.name}.quaternion`, walkTimes, [
        ...qKneeSlightlyBent.toArray(), ...qKneeBent.toArray(), ...qKneeStraight.toArray(), ...qKneeSlightlyBent.toArray(), ...qKneeSlightlyBent.toArray()
    ], interpolation));
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${ankleR.name}.quaternion`, walkTimes, [
        ...qAnkleDown.toArray(), ...qAnkleUp.toArray(), ...qAnkleUp.toArray(), ...qAnkleNeutral.toArray(), ...qAnkleDown.toArray()
    ], interpolation));


    // --- Arm Swing with Dynamic Positioning ---
    const qDownL = makeArmDownQuaternion(markerPositions, 'left_shoulder', 'left_elbow');
    const qDownR = makeArmDownQuaternion(markerPositions, 'right_shoulder', 'right_elbow');

    const armSwingAngle = Math.PI / 12; // 15 degrees base
    
    // Create base rotation for abducted (outward) arms - now using dynamic value
    const qAbductL = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, armAbduction));
    const qAbductR = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -armAbduction));
    
    // The final "arms down" pose combines: down orientation + abduction
    const qDownAbductedL = qAbductL.clone().multiply(qDownL);
    const qDownAbductedR = qAbductR.clone().multiply(qDownR);
    
    // Swing rotations (around X axis for fwd/back) are applied BEFORE the abducted pose
    const qSwing_Forward = new THREE.Quaternion().setFromEuler(new THREE.Euler(armSwingAngle, 0, 0));
    const qSwing_Back = new THREE.Quaternion().setFromEuler(new THREE.Euler(-armSwingAngle, 0, 0));

    // Right arm swings forward with left leg
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${shoulderR.name}.quaternion`, walkTimes, [
        ...qDownAbductedR.clone().multiply(qSwing_Forward).toArray(),
        ...qDownAbductedR.toArray(),
        ...qDownAbductedR.clone().multiply(qSwing_Back).toArray(),
        ...qDownAbductedR.toArray(),
        ...qDownAbductedR.clone().multiply(qSwing_Forward).toArray(),
    ], interpolation));

    // Left arm swings opposite
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${shoulderL.name}.quaternion`, walkTimes, [
        ...qDownAbductedL.clone().multiply(qSwing_Back).toArray(),
        ...qDownAbductedL.toArray(),
        ...qDownAbductedL.clone().multiply(qSwing_Forward).toArray(),
        ...qDownAbductedL.toArray(),
        ...qDownAbductedL.clone().multiply(qSwing_Back).toArray(),
    ], interpolation));

    // Slight elbow bends during walk
    const elbowWalkBend = Math.PI / 20;
    const qElbowL = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, elbowWalkBend, 0));
    const qElbowR = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -elbowWalkBend, 0));
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${elbowL.name}.quaternion`, [0], qElbowL.toArray()));
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${elbowR.name}.quaternion`, [0], qElbowR.toArray()));

    // Spine counter-rotation for balance
    const spineCounterAngle = Math.PI / 48; // ~3.75 degrees
    const qSpineL = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, spineCounterAngle));
    const qSpineR = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -spineCounterAngle));
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${spine.name}.quaternion`, walkTimes, [
        ...qSpineR.toArray(),
        ...new THREE.Quaternion().toArray(),
        ...qSpineL.toArray(),
        ...new THREE.Quaternion().toArray(),
        ...qSpineR.toArray(),
    ], interpolation));

    const walkClip = new THREE.AnimationClip('walk', -1, walkTracks);
    return walkClip;
}