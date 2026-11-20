// ====================================================================
//   SelloUomi — Figure clay stamp
//   One-file, self-contained OpenSCAD source.
//
//   PRINT ORIENTATION (FDM)
//   ------------------------
//   The model is already oriented for the build plate: the HANDLE sits
//   on z = 0 (flat bottom, sticks to bed), the puck is in the middle,
//   and the FIGURE RELIEF is on top — printed last so the detail comes
//   out crisp with no support marks. Slice and print as-is.
//
//   The handle→puck step has a 4 mm conical chamfer to soften the
//   overhang. Some slicers will still add a few supports under the
//   puck rim — leave them on for the cleanest result.
//
//   USE ORIENTATION
//   ------------------------
//   When stamping, FLIP the printed object so the figure points down
//   toward the clay. The figure is already X-mirrored in this file,
//   so flipping un-mirrors it and the impression comes out upright.
// ====================================================================

// --------- PARAMETERS (mm) ------------------------------------------
figure_width   = 27;     // X dimension of the figure relief (smallest size for FDM 0.4 nozzle)
figure_height  = 40.23;  // Y dimension of the figure relief (1 : 1.49)
relief         = 5;      // how far the figure protrudes from the puck
puck_diameter  = 60;     // —— NO LONGER USED, kept for backward-compat ——
puck_thickness = 0;      // —— NO LONGER USED, kept for backward-compat ——
handle_neck_d  = 22;     // diameter of the cylindrical grip
handle_height  = 30;     // total handle height (cylinder, FLAT top)

$fn = 96;

// --------- FIGURE (2D, in SVG units) --------------------------------
// The mirrored-for-stamping silhouette is built from a head ellipse,
// a body polygon (sampled from the original bezier), and 4 round-capped
// "fat lines" for arms & legs (hull of two circles each).
module figure_2d_svg() {
    union() {
        // HEAD — oval cx=50 cy=2 rx=6 ry=11
        translate([50, 2]) scale([6, 11]) circle(d = 2);

        // BODY — egg polygon sampled from the bezier path (40 pts).
        polygon([
            [50,19], [46.64,19.80], [43.86,22.07], [41.60,25.59], [39.79,30.13],
            [38.37,35.50], [37.29,41.46], [36.48,47.81], [35.86,54.32], [35.40,60.79],
            [35,67],  [35.19,70.72], [35.70,74.07], [36.54,77.05], [37.69,79.66],
            [39.13,81.88],[40.83,83.70], [42.79,85.14], [44.98,86.17], [47.39,86.79],
            [50,87],  [52.61,86.79], [55.02,86.17], [57.21,85.14], [59.17,83.70],
            [60.88,81.88],[62.31,79.66], [63.46,77.05], [64.30,74.07], [64.81,70.72],
            [65,67],  [64.60,60.79], [64.14,54.32], [63.52,47.81], [62.71,41.46],
            [61.63,35.50], [60.21,30.13], [58.40,25.59], [56.14,22.07], [53.36,19.80]
        ]);

        // LEFT ARM — hull of two Ø3.75 circles at the arm endpoints.
        hull() {
            translate([32.25, 28.50]) circle(d = 3.75);
            translate([25.50, 67.75]) circle(d = 3.75);
        }
        // RIGHT ARM
        hull() {
            translate([67.75, 28.50]) circle(d = 3.75);
            translate([74.50, 67.75]) circle(d = 3.75);
        }
        // LEFT LEG
        hull() {
            translate([43.125,  93]) circle(d = 3.75);
            translate([43.125, 138]) circle(d = 3.75);
        }
        // RIGHT LEG
        hull() {
            translate([56.875,  93]) circle(d = 3.75);
            translate([56.875, 138]) circle(d = 3.75);
        }
    }
}

// Scaled & centred figure in mm, in OpenSCAD's Y-up convention.
module figure_2d_mm() {
    s = figure_width / 100;
    // SVG figure bounding box midpoint is (50, 65.5) — bring it to origin
    // and flip Y so the head ends up at +Y.
    translate([-50 * s, 65.5 * s])
        scale([s, -s])
            figure_2d_svg();
}

// --------- 3D MODULES -----------------------------------------------
// Print orientation: HANDLE on the build plate (Z = 0), figure on top.
// No puck — the figure relief sits directly on the cylindrical handle.
// Slicer will add supports under the head & foot of the figure where
// they overhang the cylinder; those supports only mark the back of the
// figure (hidden inside the stamp when in use), so the stamping face
// stays crisp.

module handle() {
    // Flat-bottom cylinder — first-layer adhesion zone
    cylinder(d = handle_neck_d, h = handle_height);
}

module figure_relief() {
    // Figure on TOP (prints last — cleanest layer)
    translate([0, 0, handle_height])
    linear_extrude(height = relief)
        figure_2d_mm();
}

// --------- ASSEMBLE -------------------------------------------------
union() {
    handle();
    figure_relief();
}
