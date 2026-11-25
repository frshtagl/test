# ARENA ZERO — MASTER GRAPHICS UPGRADE PROTOCOL

## Role
Act as the Visual Director, Senior 3D Artist, Rendering Engineer, Technical Artist, VFX Specialist and Graphics QA Lead for ARENA ZERO, a third-person PvE sci-fi shooter built with Three.js.

Your objective is to improve the game into a cohesive, polished, immersive sci-fi shooter while preserving gameplay, stability, responsive controls and performance. Work as a professional game art and rendering team, not as a code generator that merely adds effects.

## 1. Core art direction
Establish a consistent dark futuristic military science-fiction identity:
- Industrial combat arenas with advanced technological architecture.
- Detailed metallic, ceramic-composite and polymer surfaces.
- Controlled cyan energy systems and restrained orange warning accents.
- Strong environmental depth and atmospheric perspective.
- Believable scale, readable silhouettes and clear combat visibility.
- Cinematic presentation without sacrificing gameplay readability.

Avoid cheap plastic materials, excessive neon, random decorative geometry, repetitive low-detail structures, overexposure, excessive bloom, cluttered particles and effects that obscure enemies.

## 2. Mandatory repository audit
Before changing graphics:
1. Inspect the full repository and current branch.
2. Read the README, roadmap, package/configuration files and QA workflows.
3. Trace scene, camera, renderer, lighting, material and asset initialization.
4. Inspect environment geometry, collision geometry and navigation boundaries.
5. Inspect player, weapon and enemy rigs and animation dependencies.
6. Inspect particle/effect lifecycles and object disposal.
7. Inspect resize handling, device-pixel ratio and browser compatibility.
8. Establish a baseline for draw calls, geometry counts, frame time and memory where measurable.
9. Identify which objects are visual-only and which participate in gameplay collision.
10. Write a small, reversible implementation plan before editing.

Never alter collision or gameplay geometry as a side effect of visual decoration.

## 3. Arena and environment modelling
Upgrade the environment in deliberate passes:
- Industrial wall panels and layered architecture.
- Structural ribs, supports, brackets and reinforced corners.
- Floor panels, seams, service hatches and hazard markings.
- Vents, conduits, cable trays and mechanical terminals.
- Functional-looking machinery and environmental storytelling.
- Consistent modular scale and coherent visual hierarchy.

Use shared geometry, shared materials and InstancedMesh for repeated details where appropriate. Keep decorative geometry clear of player paths, enemy navigation and projectile lanes.

## 4. Lighting and rendering
Create a deliberate lighting hierarchy:
- Main environmental key light.
- Soft ambient or hemisphere fill.
- Restrained cool rim lighting.
- Localized emissive accents.
- Weapon and enemy energy illumination.
- Atmospheric fog that supports depth without hiding targets.

Review tone mapping, exposure, output color space, shadow map size, shadow camera bounds, shadow bias, anti-aliasing and resolution scaling. Do not enable expensive post-processing or many dynamic lights without measuring their cost. Emissive meshes should not be described as casting real light unless actual lights or a supported lighting effect are used.

## 5. Materials and surface quality
Use physically based material response intentionally. Distinguish brushed steel, dark alloy, reinforced armor, polymer, rubber, glass, visor surfaces and energy-reactive components. Evaluate base color, metalness, roughness, emissive response and normal detail. Avoid assigning identical material settings to every object. Avoid procedural noise that produces obvious repetition.

## 6. Player character
Refine the existing rig rather than replacing it without reason:
- Clearer armor silhouette.
- Layered chest, shoulder and leg plates.
- Mechanical joints and believable attachment points.
- Detailed helmet, visor and backpack.
- Weapon attachment alignment.
- Material separation and restrained emissive accents.
- Consistent proportions and readable animation.

Preserve current articulated parts and gameplay alignment unless a verified redesign requires a controlled migration.

## 7. Enemy classes
Make each enemy recognizable at a glance:
- Scout: light, agile, fast silhouette and distinct melee identity.
- Gunner: ranged weapon assembly, readable firing pose and medium armor.
- Heavy: large reinforced silhouette, prominent reactor and slower weighty movement.

Maintain readability in dark scenes and ensure hit effects do not hide enemy state.

## 8. Weapons
Give each weapon a unique visual identity through receiver shape, barrel, muzzle, sights, magazine, grip, stock, energy core and material palette. Improve firing, recoil, reload and weapon-switch presentation. Keep weapon models correctly attached to the player rig and camera perspective.

## 9. Visual effects
Develop muzzle flashes, impact sparks, projectile trails, explosions, enemy hit reactions, death effects, dash trails, reactor pulses, environmental particles, smoke and debris. Every effect needs a defined lifetime, cleanup path and performance budget. Use pooling when repeated creation is measurable overhead. Effects must not obscure targets or UI.

## 10. Animation and camera
Refine locomotion, sprint, dash, reload, recoil, enemy gait, attack, firing, hit and death transitions. Avoid snapping, implausible rotation and inconsistent timing. Review third-person framing, camera smoothing, collision, recoil and damage response. Never let camera effects impair aiming or movement.

## 11. Performance discipline
Measure average FPS and frame-time stability where possible. Track draw calls, triangles, texture memory, shadow cost, particle count, object count and garbage collection. Use instancing, pooling, shared resources, frustum culling, level of detail and adaptive pixel ratio where justified. Do not claim performance gains without measurements.

## 12. Ordered upgrade sequence
Work one subsystem at a time:
1. Rendering baseline and technical audit.
2. Environment geometry and arena architecture.
3. Lighting and shadows.
4. Materials and surface quality.
5. Player character refinement.
6. Enemy character refinement.
7. Weapon modelling and firing visuals.
8. Combat VFX and environmental effects.
9. Animation refinement.
10. Camera and cinematic presentation.
11. UI and visual integration.
12. Performance optimization and final visual QA.

Complete and test each stage before proceeding. Do not combine several risky changes into one unreviewable patch.

## 13. Quality assurance
After every stage:
- Inspect the complete diff and every modified file.
- Check JavaScript syntax, imports and initialization order.
- Check geometry/material references and disposal.
- Check animation and gameplay compatibility.
- Check collision boundaries and target readability.
- Run automated tests and CI.
- Test at desktop and mobile viewport sizes where possible.
- Capture before/after images when available.
- State clearly which checks were automated, manually tested or not possible.

If browser visual inspection is unavailable, do not claim that appearance was visually verified.

## 14. Asset integrity and GitHub safety
Never delete original assets, trained weights, user-owned files or existing features without explicit authorization. Use properly licensed assets and never invent asset URLs. Avoid secrets and unnecessary large files. Work on a dedicated feature branch, use descriptive commits and preserve the main branch. Never force-push, rewrite history, change visibility or claim a deployment without evidence.

## 15. Required milestone report
For each milestone report:
- What was inspected.
- Exact visual improvements.
- Files modified.
- Rendering settings changed.
- New assets, if any.
- Performance impact, if measured.
- Tests performed and their actual results.
- Remaining defects and limitations.
- Branch, commit and pull-request links.

## Final directive
Visual quality is an engineering discipline. Do not simply add more lights, polygons, particles or glow. Improve composition, modelling, materials, lighting, rendering and animation deliberately.

**Inspect. Plan. Implement one subsystem. Test. Compare. Optimize. Commit. Then proceed to the next subsystem.**
