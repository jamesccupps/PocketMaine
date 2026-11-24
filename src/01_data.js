'use strict';
/* =====================================================================
   POCKET MAINE - AIR AND SEA  —  a Maine transport tycoon
   Section 1: DATA  (pure data, no logic; port this to Godot resources)
   ===================================================================== */
const SAVE_KEY = 'finestkind.save.v2';
const GEO = { latMin: 40.95, latMax: 47.6, lonMin: -73.8, lonMax: -65.8 };
const GEO_OLD_LONMIN = -72.2;                          // saves from the Maine-only map are shifted over to this one
const KM_LAT = 111.0, KM_LON = 78.2;                  // equirectangular at ~45N
const WORLD_W = (GEO.lonMax - GEO.lonMin) * KM_LON;   // ~500 km
const WORLD_H = (GEO.latMax - GEO.latMin) * KM_LAT;   // ~527 km
const DAY_LEN = 300;         // real seconds per game day: the clock runs in real time, like Pocket Planes
const SEASON_DAYS = 7;       // days per season -> a 35 minute season, a 2h20 year
const SPEED_SCALE = 0.085;   // craft "speed" stat -> km per real second (a 100 km hop in a Puddle Jumper is ~3 minutes)
const JOB_REFRESH = 240;     // seconds between job-board refreshes at each port
const FISH_TIME = 150;       // seconds on the grounds
const OFFLINE_CAP = 12 * 3600; // how much time away gets simulated when you come back
const SPRING = 0, SUMMER = 1, FALL = 2, WINTER = 3;
const SEASON_NAMES = ['Spring', 'Summer', 'Fall', 'Winter'];
const SEASON_BLURB = [
  'Mud season. Grass and gravel strips are closed without tundra tires. Ice-out brings anglers to the lakes.',
  'Summer people everywhere. Fog on the coast, lobster by the crate, tuna offshore.',
  'Leaf-peepers, hunters and the potato harvest. Lobster prices firm up. Gales start.',
  'Lakes are frozen: floats are no good there, skis are. Skiers, sledders, scallops and nor\'easters.'
];

/* ---------- geography (lat, lon pairs) ---------- */
// Maine coast, Kittery -> Calais, water on the right hand side
const COAST_ME = [
 43.07,-70.70, 43.085,-70.655, 43.13,-70.635, 43.165,-70.59, 43.21,-70.595, 43.25,-70.59, 43.30,-70.565,
 43.34,-70.51, 43.345,-70.47, 43.36,-70.425, 43.40,-70.39, 43.445,-70.335, 43.465,-70.375, 43.515,-70.375,
 43.545,-70.33, 43.53,-70.31, 43.555,-70.275, 43.56,-70.20, 43.60,-70.205, 43.625,-70.21, 43.645,-70.225,
 43.64,-70.26, 43.655,-70.265, 43.67,-70.24, 43.685,-70.255, 43.73,-70.215, 43.775,-70.18, 43.815,-70.105,
 43.865,-70.03, 43.80,-70.04, 43.73,-70.035, 43.725,-69.995, 43.80,-69.955, 43.87,-69.925, 43.80,-69.895,
 43.715,-69.86, 43.705,-69.835, 43.745,-69.79, 43.80,-69.80, 43.905,-69.82, 43.905,-69.80, 43.81,-69.775,
 43.76,-69.755, 43.775,-69.715, 43.83,-69.705, 43.97,-69.685, 43.97,-69.665, 43.84,-69.675, 43.785,-69.665,
 43.80,-69.635, 43.85,-69.63, 43.815,-69.595, 43.845,-69.57, 44.02,-69.535, 44.02,-69.515, 43.88,-69.54,
 43.835,-69.505, 43.875,-69.49, 43.95,-69.46, 44.06,-69.385, 44.055,-69.365, 43.975,-69.335, 43.94,-69.29,
 44.06,-69.20, 44.065,-69.18, 43.96,-69.245, 43.92,-69.26, 43.925,-69.23, 43.965,-69.20, 44.00,-69.13,
 44.045,-69.085, 44.09,-69.045, 44.10,-69.10, 44.125,-69.085, 44.185,-69.07, 44.21,-69.055, 44.28,-69.005,
 44.35,-68.955, 44.42,-68.995, 44.445,-68.985, 44.455,-68.92, 44.44,-68.85, 44.47,-68.81, 44.51,-68.82,
 44.57,-68.81, 44.68,-68.835, 44.795,-68.785, 44.795,-68.765, 44.68,-68.81, 44.575,-68.785, 44.50,-68.79,
 44.44,-68.78, 44.385,-68.805, 44.35,-68.78, 44.31,-68.825, 44.295,-68.76, 44.33,-68.70, 44.30,-68.63,
 44.26,-68.575, 44.225,-68.54, 44.28,-68.53, 44.40,-68.585, 44.415,-68.555, 44.36,-68.50, 44.42,-68.48,
 44.535,-68.43, 44.535,-68.415, 44.46,-68.42, 44.435,-68.37, 44.455,-68.30, 44.445,-68.27, 44.50,-68.25,
 44.525,-68.19, 44.47,-68.175, 44.445,-68.11, 44.39,-68.085, 44.335,-68.06, 44.375,-68.03, 44.405,-68.02,
 44.40,-67.975, 44.47,-67.985, 44.435,-67.93, 44.39,-67.90, 44.44,-67.875, 44.535,-67.88, 44.50,-67.83,
 44.455,-67.80, 44.50,-67.73, 44.56,-67.72, 44.535,-67.61, 44.555,-67.565, 44.61,-67.56, 44.60,-67.48,
 44.62,-67.37, 44.71,-67.43, 44.735,-67.39, 44.66,-67.32, 44.615,-67.31, 44.655,-67.205, 44.72,-67.09,
 44.77,-67.05, 44.815,-66.95, 44.86,-66.985, 44.85,-67.05, 44.80,-67.17, 44.86,-67.14, 44.905,-67.22,
 44.95,-67.165, 44.93,-67.08, 44.92,-67.02, 44.905,-66.985, 44.93,-66.99, 44.97,-67.065, 45.07,-67.13,
 45.14,-67.22, 45.185,-67.285 ];
// Maine inland border, Calais -> Kittery (NB, Quebec, NH)
const BORDER_ME = [
 45.15,-67.40, 45.27,-67.47, 45.50,-67.42, 45.57,-67.43, 45.60,-67.60, 45.68,-67.72, 45.76,-67.80,
 45.83,-67.78, 45.94,-67.78, 47.065,-67.79, 47.16,-67.935, 47.24,-68.03, 47.30,-68.15, 47.355,-68.33,
 47.29,-68.40, 47.26,-68.59, 47.20,-68.75, 47.18,-68.905, 47.25,-69.05, 47.34,-69.05, 47.43,-69.04,
 47.46,-69.225, 46.70,-70.00, 46.41,-70.06, 46.19,-70.29, 45.96,-70.25, 45.81,-70.40, 45.67,-70.56,
 45.51,-70.72, 45.39,-70.81, 45.24,-70.85, 45.31,-71.08, 44.00,-71.01, 43.57,-70.975, 43.39,-70.985,
 43.27,-70.90, 43.23,-70.815, 43.13,-70.83, 43.09,-70.76 ];
// Long Island Sound to Kittery: Connecticut, Rhode Island, Buzzards Bay, the Cape, Boston, Cape Ann, New Hampshire
const COAST_NH = [
 41.00,-73.655, 41.02,-73.58, 41.04,-73.50, 41.06,-73.42, 41.10,-73.38, 41.12,-73.28, 41.15,-73.20, 41.17,-73.16, 41.16,-73.10,
 41.20,-73.07, 41.21,-73.00, 41.24,-72.95, 41.28,-72.93, 41.29,-72.90, 41.25,-72.89, 41.25,-72.82, 41.26,-72.72, 41.27,-72.60,
 41.26,-72.48, 41.27,-72.38, 41.30,-72.35, 41.27,-72.33, 41.29,-72.25, 41.31,-72.18, 41.30,-72.12, 41.34,-72.095, 41.36,-72.085,
 41.32,-72.07, 41.31,-72.00, 41.33,-71.95, 41.34,-71.90, 41.31,-71.86, 41.33,-71.78, 41.36,-71.65, 41.37,-71.55, 41.36,-71.485,
 41.40,-71.46, 41.45,-71.44, 41.52,-71.42, 41.60,-71.42, 41.68,-71.40, 41.74,-71.39, 41.79,-71.40, 41.825,-71.385, 41.80,-71.35,
 41.76,-71.32, 41.73,-71.28, 41.69,-71.285, 41.66,-71.27, 41.69,-71.24, 41.73,-71.20, 41.72,-71.16, 41.66,-71.18, 41.60,-71.195,
 41.53,-71.20, 41.46,-71.195, 41.49,-71.13, 41.51,-71.06, 41.50,-71.00, 41.54,-70.955, 41.58,-70.93, 41.63,-70.92, 41.59,-70.895,
 41.60,-70.84, 41.64,-70.80, 41.68,-70.75, 41.71,-70.72, 41.75,-70.68, 41.76,-70.63, 41.71,-70.62, 41.65,-70.635, 41.58,-70.645,
 41.53,-70.67, 41.535,-70.62, 41.55,-70.55, 41.60,-70.45, 41.62,-70.36, 41.635,-70.28, 41.65,-70.18, 41.66,-70.08, 41.67,-69.98,
 41.61,-69.975, 41.56,-69.995, 41.62,-69.955, 41.70,-69.93, 41.80,-69.935, 41.90,-69.955, 42.00,-70.02, 42.055,-70.12, 42.08,-70.20,
 42.06,-70.245, 42.03,-70.20, 42.025,-70.17, 42.045,-70.175, 42.05,-70.15, 42.03,-70.10, 41.98,-70.075, 41.92,-70.07, 41.87,-70.03,
 41.81,-70.005, 41.77,-70.03, 41.755,-70.12, 41.75,-70.20, 41.73,-70.28, 41.74,-70.38, 41.77,-70.48, 41.80,-70.52, 41.87,-70.535,
 41.93,-70.55, 41.96,-70.62, 41.97,-70.67, 42.00,-70.66, 42.01,-70.61, 42.06,-70.64, 42.12,-70.68, 42.20,-70.715, 42.25,-70.77,
 42.27,-70.83, 42.30,-70.88, 42.27,-70.90, 42.26,-70.96, 42.29,-71.01, 42.33,-71.04, 42.36,-71.05, 42.375,-71.02, 42.37,-70.975,
 42.40,-70.98, 42.44,-70.95, 42.425,-70.915, 42.46,-70.925, 42.48,-70.88, 42.50,-70.84, 42.525,-70.87, 42.545,-70.86, 42.57,-70.78,
 42.575,-70.70, 42.61,-70.67, 42.585,-70.655, 42.61,-70.62, 42.66,-70.60, 42.69,-70.63, 42.665,-70.685, 42.69,-70.74, 42.72,-70.78,
 42.77,-70.805, 42.815,-70.81, 42.85,-70.815, 42.92,-70.80, 43.00,-70.74, 43.045,-70.715 ];
// the rest of New England's outline, from where Maine, New Hampshire and Quebec meet: Quebec line, Lake Champlain, the New York line, back to the Sound
const BORDER_NE = [ 45.25,-71.39, 45.01,-71.50, 45.01,-72.50, 45.01,-73.34, 44.55,-73.39, 44.05,-73.41, 43.63,-73.42, 43.52,-73.25, 43.20,-73.26, 42.745,-73.265, 42.05,-73.487, 41.30,-73.55, 41.21,-73.48, 41.10,-73.73 ];
// state lines, drawn dotted
const STATE_LINES = [
 [45.01,-71.50, 44.75,-71.63, 44.49,-71.59, 44.33,-71.80, 44.15,-72.04, 43.82,-72.18, 43.65,-72.31, 43.40,-72.40, 43.13,-72.44, 42.87,-72.55, 42.727,-72.458],
 [42.745,-73.265, 42.727,-72.458, 42.70,-71.30, 42.80,-71.18, 42.89,-70.93, 42.87,-70.82],
 [42.05,-73.487, 42.03,-72.60, 42.008,-71.80, 42.02,-71.38, 41.89,-71.38, 41.86,-71.34, 41.73,-71.22, 41.68,-71.13, 41.50,-71.12],
 [42.008,-71.80, 41.42,-71.80, 41.32,-71.86] ];
const CHAMPLAIN = [45.01,-73.36, 44.80,-73.40, 44.60,-73.44, 44.40,-73.40, 44.20,-73.43, 44.05,-73.46, 43.85,-73.42, 43.65,-73.44, 43.62,-73.40, 43.85,-73.37,
 44.05,-73.38, 44.25,-73.30, 44.45,-73.24, 44.62,-73.22, 44.72,-73.28, 44.85,-73.20, 45.01,-73.17];
const ST_LAWRENCE = [45.40,-73.80, 45.52,-73.50, 45.80,-73.20, 46.04,-73.08, 46.25,-72.75, 46.35,-72.50, 46.60,-71.90, 46.78,-71.25, 46.95,-70.80, 47.25,-70.40, 47.60,-70.05,
 47.60,-70.35, 47.30,-70.60, 47.02,-70.95, 46.83,-71.22, 46.68,-71.90, 46.42,-72.55, 46.32,-72.90, 46.10,-73.18, 45.70,-73.45, 45.50,-73.80];
const COAST_NB = [ 45.195,-67.27, 45.16,-67.18, 45.10,-67.09, 45.065,-67.045, 45.13,-67.02, 45.17,-66.95,
 45.12,-66.85, 45.05,-66.88, 45.04,-66.80, 45.07,-66.65, 45.13,-66.45, 45.20,-66.20, 45.26,-66.07, 45.29,-65.80 ];
// islands: [isMaine, ...lat,lon]
const ISLANDS = [
 [1, 44.44,-68.36, 44.43,-68.25, 44.39,-68.20, 44.33,-68.18, 44.29,-68.20, 44.28,-68.27, 44.36,-68.305, 44.29,-68.315, 44.27,-68.33, 44.22,-68.34, 44.25,-68.42, 44.33,-68.42, 44.40,-68.41], // Mount Desert
 [1, 44.30,-68.68, 44.27,-68.62, 44.20,-68.60, 44.15,-68.63, 44.15,-68.70, 44.20,-68.73, 44.26,-68.72],   // Deer Isle
 [1, 44.09,-68.62, 44.07,-68.59, 44.01,-68.61, 44.00,-68.65, 44.05,-68.66],                               // Isle au Haut
 [1, 44.10,-68.84, 44.09,-68.79, 44.05,-68.77, 44.02,-68.80, 44.02,-68.86, 44.05,-68.90, 44.08,-68.89],   // Vinalhaven
 [1, 44.16,-68.92, 44.16,-68.82, 44.13,-68.80, 44.12,-68.88, 44.13,-68.93],                               // North Haven
 [1, 44.37,-68.89, 44.33,-68.87, 44.26,-68.90, 44.25,-68.93, 44.31,-68.91, 44.36,-68.91],                 // Islesboro
 [1, 44.19,-68.45, 44.17,-68.40, 44.14,-68.42, 44.14,-68.48, 44.17,-68.49],                               // Swans
 [1, 43.885,-68.905, 43.88,-68.865, 43.845,-68.87, 43.85,-68.905],                                        // Matinicus
 [1, 43.785,-69.325, 43.78,-69.295, 43.745,-69.30, 43.75,-69.33],                                         // Monhegan
 [1, 44.52,-67.62, 44.51,-67.57, 44.46,-67.57, 44.45,-67.61, 44.49,-67.63],                               // Great Wass / Beals
 [1, 43.755,-70.125, 43.765,-70.09, 43.735,-70.085, 43.72,-70.12],                                        // Chebeague
 [1, 43.672,-70.20, 43.667,-70.178, 43.648,-70.183, 43.65,-70.202],                                       // Peaks
 [1, 43.70,-70.165, 43.70,-70.13, 43.683,-70.15],                                                         // Long (Casco)
 [0, 44.95,-66.95, 44.93,-66.88, 44.84,-66.92, 44.85,-66.97],                                             // Campobello
 [0, 44.80,-66.80, 44.78,-66.72, 44.62,-66.78, 44.60,-66.88, 44.70,-66.90],                               // Grand Manan
 [0, 45.02,-66.97, 45.02,-66.93, 44.96,-66.94, 44.97,-66.98],                                             // Deer Island NB
 [1, 41.48,-70.60, 41.46,-70.555, 41.42,-70.52, 41.39,-70.50, 41.37,-70.45, 41.345,-70.48, 41.345,-70.60, 41.335,-70.72, 41.30,-70.80, 41.31,-70.835, 41.35,-70.84, 41.37,-70.775, 41.41,-70.72, 41.45,-70.66],   // Martha's Vineyard
 [1, 41.39,-70.045, 41.345,-70.015, 41.29,-69.965, 41.245,-69.97, 41.24,-70.06, 41.245,-70.15, 41.27,-70.22, 41.29,-70.235, 41.30,-70.17, 41.285,-70.105, 41.30,-70.06, 41.33,-70.035, 41.37,-70.055],   // Nantucket
 [1, 41.23,-71.575, 41.20,-71.555, 41.16,-71.55, 41.145,-71.585, 41.16,-71.615, 41.19,-71.60],   // Block Island
 [1, 41.635,-71.245, 41.60,-71.225, 41.54,-71.23, 41.50,-71.245, 41.465,-71.29, 41.455,-71.345, 41.49,-71.335, 41.53,-71.315, 41.58,-71.29, 41.62,-71.275],   // Aquidneck
 [1, 41.57,-71.375, 41.52,-71.365, 41.48,-71.385, 41.50,-71.40, 41.55,-71.395],   // Conanicut
 [0, 40.90,-73.78, 40.94,-73.45, 40.97,-73.10, 40.97,-72.85, 40.995,-72.62, 41.06,-72.43, 41.13,-72.30, 41.16,-72.235, 41.11,-72.33, 41.05,-72.42, 40.98,-72.55, 40.94,-72.62, 40.93,-72.50, 40.98,-72.34, 41.03,-72.18, 41.02,-72.05, 41.07,-71.86, 41.03,-71.93, 40.97,-72.15, 40.86,-72.50, 40.80,-72.80, 40.75,-73.20, 40.75,-73.78],   // Long Island
 [0, 44.72,-65.80, 44.55,-66.00, 44.40,-66.20, 44.25,-66.37, 44.24,-66.33, 44.38,-66.12, 44.45,-65.95, 44.30,-66.10, 44.10,-66.20, 43.95,-66.16, 43.80,-66.15, 43.70,-66.03, 43.55,-65.85, 43.50,-65.80] // Nova Scotia
];
// islets: lat, lon, radius km (all Maine)
const ISLETS = [
 44.245,-68.265,1.3, 44.12,-68.36,1.6, 44.11,-68.50,1.3, 43.88,-69.125,1.0, 43.835,-68.895,0.9, 43.785,-68.855,0.5,
 43.89,-69.435,1.3, 43.87,-69.31,0.8, 43.76,-69.615,0.7, 43.71,-69.76,0.5, 43.675,-70.205,0.8, 43.695,-70.11,0.8,
 43.69,-70.085,0.6, 44.23,-68.79,0.8, 44.215,-68.765,0.6, 44.235,-68.82,0.8, 44.34,-68.445,1.6, 44.335,-68.50,1.7,
 44.39,-68.13,0.9, 44.37,-67.865,0.5, 44.50,-67.53,1.4, 44.575,-67.52,1.6, 44.60,-67.285,1.1, 44.50,-67.10,0.4,
 43.97,-68.13,0.35, 43.12,-70.475,0.35, 42.98,-70.61,0.6, 43.545,-70.235,0.6, 44.02,-68.72,0.7, 43.98,-68.93,0.6,
 44.19,-68.95,0.6, 44.42,-68.03,0.5, 43.65,-70.03,0.5,
 41.27,-71.98,1.4, 41.49,-70.76,1.5, 41.46,-70.82,1.7, 41.435,-70.88,1.3, 41.42,-70.935,1.0, 42.32,-70.93,0.6, 41.31,-70.28,0.9 ];
// Moosehead as a polygon; other lakes as rough ellipses [lat, lon, semiMajorKm, semiMinorKm, rotationDeg(0=E-W)]
const MOOSEHEAD = [45.455,-69.60, 45.52,-69.66, 45.58,-69.72, 45.63,-69.79, 45.67,-69.75, 45.70,-69.70, 45.72,-69.77,
 45.80,-69.76, 45.88,-69.72, 45.89,-69.62, 45.82,-69.59, 45.76,-69.60, 45.75,-69.50, 45.69,-69.52, 45.67,-69.60,
 45.61,-69.56, 45.60,-69.49, 45.56,-69.53, 45.50,-69.55];
const LAKES = [
 43.85,-70.57,8,6,60,  44.95,-70.69,6,2.4,-10,  44.90,-70.80,7,2.6,80,  44.80,-70.84,5,2,70,  45.19,-70.27,10,2,10,
 46.00,-69.40,14,2.5,125,  46.21,-69.30,11,2.4,130,  46.335,-69.36,6,3,100,  46.48,-69.28,3.5,2,60,  45.73,-68.86,9,4,20,
 45.66,-68.97,6,3,-20,  45.26,-67.85,8,5,70,  45.75,-67.86,8,3,120,  45.30,-69.30,7,1.6,10,  45.38,-68.93,6,1.8,80,
 45.67,-69.88,4,2.4,20,  45.62,-70.275,3,1.6,30,  45.57,-70.31,2.6,1.6,0,  44.67,-68.40,6,1.5,95,  44.53,-69.87,3.5,3,0,
 44.48,-69.78,5,1,80,  44.43,-69.57,5,1.3,70,  44.27,-69.92,5,1.3,70,  44.03,-70.63,7,1,100,  47.20,-68.25,6,3,130,
 47.06,-68.37,4,3,60,  47.05,-68.52,8,1.5,150,  46.77,-68.50,3,2,40,  45.18,-67.60,8,2.5,10,  45.13,-68.17,6,1.4,60,
 45.47,-68.87,5,1.6,90,  45.05,-70.98,9,1.4,85,  44.75,-71.03,5,2.5,80,  46.30,-69.57,3,2,0,  46.20,-69.62,4,1.6,30,
 45.87,-69.52,3,1.6,60,  45.92,-69.87,9,1.4,0,  46.62,-69.40,3,1.2,100,  44.92,-67.88,4,1.4,40,  45.02,-67.45,5,1.5,20,
 44.73,-69.93,2.5,1.2,0, 44.20,-70.05,3,1,70,  45.90,-68.60,3,1.2,90, 46.15,-68.80,4,1.3,120, 44.42,-70.02,2.5,1,80,
 43.60,-71.35,12,5,-45,  43.75,-71.53,4,2,30,  43.66,-71.77,4,1.5,90,  43.38,-72.06,6,1.5,90,  43.79,-71.14,3,2,0,
 44.98,-72.22,7,1.8,90,  42.38,-72.30,11,3,90,  42.40,-71.70,3,1.5,30,  41.50,-73.45,6,1.2,90,  43.60,-73.58,14,1.5,65 ];
// rivers as polylines
const RIVERS = [
 [44.80,-68.77, 44.93,-68.65, 45.10,-68.63, 45.24,-68.66, 45.36,-68.50, 45.61,-68.53, 45.65,-68.71, 45.70,-68.92, 45.80,-69.05, 45.88,-69.18, 45.95,-69.33],
 [45.61,-68.53, 45.73,-68.59, 45.95,-68.66, 46.13,-68.79],
 [43.91,-69.81, 44.00,-69.83, 44.23,-69.77, 44.31,-69.78, 44.55,-69.63, 44.77,-69.72, 44.80,-69.88, 44.95,-69.86, 45.06,-69.88, 45.34,-69.97, 45.50,-69.82, 45.58,-69.72],
 [43.99,-69.87, 43.92,-69.97, 44.00,-70.06, 44.10,-70.22, 44.30,-70.20, 44.47,-70.19, 44.50,-70.35, 44.55,-70.55, 44.40,-70.79, 44.39,-70.98],
 [46.56,-69.90, 46.75,-69.70, 46.93,-69.38, 47.08,-69.04, 47.17,-68.91],
 [46.25,-69.32, 46.335,-69.36, 46.48,-69.28, 46.60,-69.40, 46.75,-69.28, 46.95,-69.20, 47.08,-69.04],
 [46.55,-68.65, 46.63,-68.40, 46.68,-68.02, 46.86,-68.00, 46.77,-67.83],
 [44.02,-70.98, 43.92,-70.85, 43.80,-70.80, 43.68,-70.62, 43.61,-70.55, 43.50,-70.44, 43.465,-70.38],
 [45.36,-68.50, 45.30,-68.75, 45.25,-69.00, 45.28,-69.15],
 [44.71,-67.45, 44.80,-67.55, 44.90,-67.70],
 [44.90,-68.66, 45.00,-68.45, 45.10,-68.30],
 [45.01,-71.50, 44.75,-71.63, 44.49,-71.59, 44.33,-71.80, 44.15,-72.04, 43.82,-72.18, 43.65,-72.31, 43.40,-72.40, 43.13,-72.44, 42.87,-72.55, 42.60,-72.57, 42.33,-72.61, 42.10,-72.59, 41.76,-72.65, 41.56,-72.60, 41.42,-72.43, 41.30,-72.35],
 [43.60,-71.65, 43.44,-71.60, 43.21,-71.53, 42.99,-71.46, 42.76,-71.45, 42.65,-71.31, 42.70,-71.16, 42.77,-71.07, 42.81,-70.90, 42.815,-70.82],
 [44.26,-72.58, 44.34,-72.75, 44.42,-72.95, 44.49,-73.12, 44.53,-73.27],
 [42.45,-73.25, 42.20,-73.35, 41.95,-73.37, 41.70,-73.42, 41.45,-73.27, 41.32,-73.10, 41.20,-73.10] ];
// mountains: lat, lon, size 1..3
const MOUNTAINS = [
 45.904,-68.921,3, 45.03,-70.31,2, 45.15,-70.29,2, 44.94,-70.50,2, 44.57,-70.95,2, 44.97,-70.36,1, 44.73,-70.34,1,
 45.70,-69.73,1, 45.76,-69.45,1, 45.48,-69.71,1, 46.07,-68.85,2, 45.47,-70.11,1, 45.78,-70.21,1, 44.35,-68.225,1,
 44.23,-69.075,1, 44.75,-70.55,1, 44.61,-70.90,1, 45.55,-69.25,2, 45.90,-69.05,1, 46.52,-67.81,1, 46.96,-68.85,1,
 44.03,-70.82,1, 45.28,-70.50,1, 45.00,-70.75,1, 44.85,-70.60,1, 45.98,-68.98,2, 45.35,-69.55,1, 44.47,-70.85,1,
 46.40,-69.95,1, 45.20,-70.55,1,
 44.27,-71.30,3, 44.16,-71.64,2, 44.09,-71.45,1, 44.02,-71.83,2, 43.95,-71.27,1, 43.38,-71.86,1, 42.86,-72.11,2, 44.92,-72.53,2,
 44.54,-72.81,3, 44.32,-72.89,2, 44.12,-72.94,1, 43.60,-72.82,3, 43.44,-72.45,1, 43.09,-72.92,2, 43.17,-73.12,1, 42.64,-73.17,2,
 42.49,-71.89,1, 44.57,-71.89,1, 44.51,-71.41,1, 44.87,-71.30,1, 42.24,-72.65,1, 42.04,-73.45,1 ];
// lighthouses: lat, lon, striped(1 = West Quoddy candy stripes)
const LIGHTS = [ 43.07,-70.71,0, 42.64,-70.575,0, 42.328,-70.89,0, 42.27,-70.76,0, 42.04,-70.055,0, 41.67,-69.95,0, 41.285,-69.965,0, 41.35,-70.84,0, 41.36,-71.48,0, 41.15,-71.55,0, 41.45,-71.40,0, 41.305,-72.09,0, 41.25,-72.90,0, 41.07,-71.86,0,
 43.623,-70.208,0, 43.165,-70.591,0, 43.707,-69.758,0, 43.837,-69.506,0, 43.765,-69.316,0, 44.092,-69.044,0,
 43.784,-68.855,0, 44.222,-68.337,0, 43.969,-68.128,0, 44.367,-67.864,0, 44.815,-66.951,1, 43.917,-69.261,0, 43.121,-70.476,0 ];
// place names painted on the map (not ports)
const MAP_NAMES = [ ['GULF OF MAINE', 43.35, -68.4, 'sea'], ['PENOBSCOT BAY', 44.22, -68.98, 'sea2'], ['CASCO BAY', 43.60, -70.02, 'sea2'],
 ['MOOSEHEAD', 45.66, -69.66, 'lake'], ['KATAHDIN', 45.95, -68.92, 'mt'], ['NEW BRUNSWICK', 46.3, -67.2, 'far'], ['QUEBEC', 46.6, -70.9, 'far'],
 ['NEW HAMPSHIRE', 43.92, -71.62, 'land'], ['VERMONT', 43.95, -72.75, 'land'], ['MASSACHUSETTS', 42.42, -72.15, 'land'], ['CONNECTICUT', 41.60, -72.78, 'land'], ['R.I.', 41.60, -71.62, 'land'], ['MAINE', 45.22, -69.08, 'land'],
 ['NEW YORK', 42.9, -73.62, 'far'], ['CAPE COD BAY', 41.90, -70.30, 'sea2'], ['NANTUCKET SOUND', 41.47, -70.27, 'sea2'], ['LONG ISLAND SOUND', 41.12, -72.85, 'sea2'], ['MASS. BAY', 42.42, -70.60, 'sea2'], ['GEORGES BANK', 41.42, -67.60, 'sea'], ['CHAMPLAIN', 44.55, -73.33, 'lake'], ['ST. LAWRENCE', 46.52, -72.25, 'lake'], ['NOVA SCOTIA', 44.15, -66.0, 'far'], ['BAY OF FUNDY', 44.85, -66.25, 'sea2'], ['THE COUNTY', 46.45, -68.45, 'land'],
 ['NORTH WOODS', 46.55, -69.55, 'land'], ['DOWNEAST', 44.95, -67.75, 'land'] ];

/* ---------- ports ----------
   strip: 0 none, 1 grass/gravel (bush planes only), 2 paved     water: 'sea' | 'lake' | null
   size: 1..4 (how much work the place generates)      lab: label side */
const PORTS = [
 { id:'pwm', name:'Portland',         lat:43.655, lon:-70.265, strip:2, water:'sea',  reg:'Southern Coast', size:4, cost:3000,     lab:'l', tags:['city','market'], blurb:'The big city, by Maine standards. Jetport, working waterfront, and the fish exchange.' },
 { id:'rkd', name:'Rockland',         lat:44.10,  lon:-69.105, strip:2, water:'sea',  reg:'Midcoast',       size:3, cost:2200,     lab:'l', tags:['coast','market'], blurb:'Gateway to the islands. If it floats or flies to Penobscot Bay, it leaves from here.' },
 { id:'vin', name:'Vinalhaven',       lat:44.045, lon:-68.835, strip:1, water:'sea',  reg:'Islands',        size:2, cost:1200,  lab:'b', tags:['island','lobster'], blurb:'Twelve hundred souls and more lobster boats than cars that run.' },
 { id:'lew', name:'Lewiston-Auburn',  lat:44.05,  lon:-70.28,  strip:2, water:null,   reg:'Central',        size:3, cost:600,   lab:'l', tags:['city'], blurb:'Twin mill cities on the Androscoggin. Good paved runway, better pie.' },
 { id:'aug', name:'Augusta',          lat:44.32,  lon:-69.795, strip:2, water:null,   reg:'Central',        size:3, cost:900,   lab:'l', tags:['city','capitol'], blurb:'The capital. Legislators always need to be somewhere else in a hurry.' },
 { id:'bbh', name:'Boothbay Harbor',  lat:43.85,  lon:-69.63,  strip:0, water:'sea',  reg:'Midcoast',       size:2, cost:1200,  lab:'l', tags:['tourist','coast'], blurb:'Fudge, footbridge, and a harbor full of people who summer as a verb.' },
 { id:'mat', name:'Matinicus',        lat:43.865, lon:-68.885, strip:1, water:'sea',  reg:'Islands',        size:1, cost:1500,  lab:'r', tags:['island','lobster','remote'], blurb:'Twenty miles out. A gravel strip, a harbor, and opinions.' },
 { id:'mon', name:'Monhegan',         lat:43.765, lon:-69.315, strip:0, water:'sea',  reg:'Islands',        size:1, cost:1800,  lab:'b', tags:['island','tourist','remote'], blurb:'No airstrip, no cars, a great many painters. Boats and floatplanes only.' },
 { id:'iah', name:'Isle au Haut',     lat:44.075, lon:-68.635, strip:0, water:'sea',  reg:'Islands',        size:1, cost:2000,  lab:'r', tags:['island','remote'], blurb:'The mail boat is the whole economy. Pronounced "I\'ll a hoe", more or less.' },
 { id:'sto', name:'Stonington',       lat:44.156, lon:-68.667, strip:1, water:'sea',  reg:'Downeast',       size:2, cost:2500,  lab:'t', tags:['coast','lobster'], blurb:'Lands more lobster than anywhere in the state and knows it.' },
 { id:'bgr', name:'Bangor',           lat:44.807, lon:-68.82,  strip:2, water:null,   reg:'Central',        size:4, cost:4000,  lab:'l', tags:['city'], blurb:'Queen City of the East. A runway long enough to land anything, and often asked to.' },
 { id:'bhb', name:'Bar Harbor',       lat:44.39,  lon:-68.205, strip:2, water:'sea',  reg:'Downeast',       size:3, cost:5000,  lab:'r', tags:['tourist','coast'], blurb:'Acadia next door. In July the whole East Coast tries to park here.' },
 { id:'rng', name:'Rangeley',         lat:44.965, lon:-70.645, strip:2, water:'lake', reg:'Western Mountains', size:2, cost:6000, lab:'l', tags:['woods','lake','ski','leaf','camp'], blurb:'Lakes, loons, Saddleback, and foliage that stops traffic.' },
 { id:'sug', name:'Carrabassett',     lat:45.085, lon:-70.215, strip:2, water:null,   reg:'Western Mountains', size:2, cost:6500, lab:'r', tags:['ski','woods','leaf'], blurb:'Sugarloaf\'s valley. Dead quiet in May, standing room only in February.' },
 { id:'jon', name:'Jonesport',        lat:44.533, lon:-67.605, strip:0, water:'sea',  reg:'Downeast',       size:2, cost:7000,  lab:'t', tags:['coast','lobster','downeast'], blurb:'Home of the fastest lobster boats alive, and the people who race them.' },
 { id:'gnr', name:'Greenville',       lat:45.46,  lon:-69.59,  strip:2, water:'lake', reg:'North Woods',    size:2, cost:8000,  lab:'b', tags:['woods','lake','camp','leaf','sled'], blurb:'Foot of Moosehead. Floatplane capital of the east.' },
 { id:'jkm', name:'Jackman',          lat:45.63,  lon:-70.255, strip:1, water:'lake', reg:'North Woods',    size:1, cost:9000,  lab:'l', tags:['woods','lake','hunt','sled'], blurb:'Last stop before Quebec. Moose outnumber registered voters.' },
 { id:'mlt', name:'Millinocket',      lat:45.66,  lon:-68.71,  strip:2, water:'lake', reg:'North Woods',    size:2, cost:11000, lab:'r', tags:['woods','lake','camp','sled','leaf'], blurb:'The Magic City, in Katahdin\'s shadow. Mill\'s gone; mountain isn\'t.' },
 { id:'epm', name:'Eastport',         lat:44.905, lon:-66.99,  strip:2, water:'sea',  reg:'Downeast',       size:2, cost:12000, lab:'t', tags:['coast','downeast','scallop'], blurb:'Easternmost city in the country. Twenty-foot tides and scallops to match.' },
 { id:'gls', name:'Grand Lake Stream',lat:45.18,  lon:-67.775, strip:0, water:'lake', reg:'Downeast',       size:1, cost:13000, lab:'l', tags:['woods','lake','camp','hunt','remote'], blurb:'Landlocked salmon, Grand Laker canoes, guides who won\'t say where.' },
 { id:'chm', name:'Chamberlain Lake', lat:46.21,  lon:-69.30,  strip:0, water:'lake', reg:'North Woods',    size:1, cost:16000, lab:'r', tags:['woods','lake','camp','hunt','remote'], blurb:'Heart of the Allagash. No road worth the name. Floats in, skis in, or stay home.' },
 { id:'pqi', name:'Presque Isle',     lat:46.69,  lon:-68.045, strip:2, water:null,   reg:'The County',     size:3, cost:20000, lab:'l', tags:['county','potato','city'], blurb:'Capital of potato country. School lets out for harvest, or used to.' },
 { id:'fkt', name:'Fort Kent',        lat:47.255, lon:-68.59,  strip:1, water:null,   reg:'The County',     size:2, cost:26000, lab:'b', tags:['county','potato','sled','remote'], blurb:'Top of Route 1, half in French. Ployes, sled dogs, and a long way from anywhere.' },
 // ----- beyond Maine: New Hampshire and Vermont (level 4), southern New England (level 6), Canada (level 8) -----
 { id:"psm", name:"Portsmouth", lat:43.06, lon:-70.745, strip:2, water:"sea", reg:"New Hampshire", size:3, cost:9000, lab:"l", lvl:4, tags:["city", "coast", "market"], blurb:"Brick streets, tugboats and a naval yard across the river. The first stop over the bridge." },
 { id:"mht", name:"Manchester", lat:42.95, lon:-71.45, strip:2, water:null, reg:"New Hampshire", size:3, cost:12000, lab:"l", lvl:4, tags:["city"], blurb:"Mill buildings a mile long and the busiest airport north of Boston." },
 { id:"lci", name:"Laconia", lat:43.63, lon:-71.47, strip:2, water:"lake", reg:"New Hampshire", size:2, cost:10000, lab:"l", lvl:4, tags:["lake", "tourist", "camp"], blurb:"Lake Winnipesaukee. Mail boats, motorboats, and a week of motorcycles every June." },
 { id:"cnw", name:"North Conway", lat:44.05, lon:-71.13, strip:1, water:null, reg:"New Hampshire", size:2, cost:11000, lab:"r", lvl:4, tags:["ski", "leaf", "woods", "tourist"], blurb:"Outlet shops below, Mount Washington above. Skiers in winter, leaf traffic in the fall." },
 { id:"bml", name:"Berlin", lat:44.575, lon:-71.18, strip:2, water:null, reg:"New Hampshire", size:1, cost:9000, lab:"l", lvl:4, tags:["woods", "sled", "hunt"], blurb:"A paper town on the Androscoggin, deep in the North Country." },
 { id:"leb", name:"Lebanon", lat:43.63, lon:-72.3, strip:2, water:null, reg:"New Hampshire", size:2, cost:12000, lab:"l", lvl:4, tags:["city", "leaf"], blurb:"The Upper Valley. A college, a hospital, and a runway cut into a hilltop." },
 { id:"btv", name:"Burlington", lat:44.47, lon:-73.21, strip:2, water:"lake", reg:"Vermont", size:4, cost:22000, lab:"r", lvl:4, tags:["city", "lake", "market"], blurb:"Vermont's one real city, on Lake Champlain. The sun sets over the Adirondacks." },
 { id:"mpv", name:"Montpelier", lat:44.2, lon:-72.57, strip:2, water:null, reg:"Vermont", size:2, cost:14000, lab:"r", lvl:4, tags:["city", "capitol"], blurb:"The smallest state capital in the country. A gold dome and a lot of maple." },
 { id:"mvl", name:"Stowe", lat:44.5, lon:-72.65, strip:2, water:null, reg:"Vermont", size:2, cost:16000, lab:"t", lvl:4, tags:["ski", "leaf", "tourist"], blurb:"Mount Mansfield, a white steeple, and lift lines by nine." },
 { id:"rut", name:"Rutland", lat:43.55, lon:-72.95, strip:2, water:null, reg:"Vermont", size:2, cost:15000, lab:"l", lvl:4, tags:["ski", "leaf"], blurb:"A marble town at the foot of Killington." },
 { id:"efk", name:"Newport, Vt.", lat:44.9, lon:-72.23, strip:1, water:"lake", reg:"Vermont", size:1, cost:12000, lab:"t", lvl:4, tags:["lake", "woods", "sled", "remote"], blurb:"The Northeast Kingdom, on Memphremagog. Half the lake is in Quebec." },
 { id:"bos", name:"Boston", lat:42.355, lon:-71.08, strip:2, water:"sea", reg:"Massachusetts", size:5, cost:45000, lab:"l", lvl:6, tags:["city", "market", "coast"], blurb:"The Hub. Everybody has a cousin here, and every one of them wants lobster sent down." },
 { id:"glo", name:"Gloucester", lat:42.625, lon:-70.68, strip:0, water:"sea", reg:"Massachusetts", size:2, cost:18000, lab:"t", lvl:6, tags:["coast", "lobster"], blurb:"The oldest fishing port in the country. The fleet still goes out past the man at the wheel." },
 { id:"orh", name:"Worcester", lat:42.27, lon:-71.87, strip:2, water:null, reg:"Massachusetts", size:3, cost:20000, lab:"l", lvl:6, tags:["city"], blurb:"Seven hills, the heart of the Commonwealth, and a runway on top of one of them." },
 { id:"spf", name:"Springfield", lat:42.11, lon:-72.55, strip:2, water:null, reg:"Massachusetts", size:3, cost:20000, lab:"r", lvl:6, tags:["city"], blurb:"The Pioneer Valley. Basketball was invented here and they will tell you so." },
 { id:"psf", name:"Pittsfield", lat:42.44, lon:-73.24, strip:2, water:null, reg:"Massachusetts", size:2, cost:16000, lab:"r", lvl:6, tags:["leaf", "ski", "tourist"], blurb:"The Berkshires. Summer music, fall color, and old money in the hills." },
 { id:"ewb", name:"New Bedford", lat:41.615, lon:-70.94, strip:2, water:"sea", reg:"Massachusetts", size:3, cost:24000, lab:"l", lvl:6, tags:["coast", "scallop", "market"], blurb:"The richest fishing port in the country, on scallops alone." },
 { id:"pvc", name:"Provincetown", lat:42.055, lon:-70.19, strip:2, water:"sea", reg:"Cape & Islands", size:2, cost:20000, lab:"t", lvl:6, tags:["tourist", "coast", "remote"], blurb:"The very tip of the Cape. Dunes, galleries, and a ferry full of day-trippers." },
 { id:"hya", name:"Hyannis", lat:41.665, lon:-70.28, strip:2, water:"sea", reg:"Cape & Islands", size:3, cost:26000, lab:"t", lvl:6, tags:["tourist", "coast", "market"], blurb:"Hub of the Cape. Every island flight and half the ferries start here." },
 { id:"ack", name:"Nantucket", lat:41.275, lon:-70.09, strip:2, water:"sea", reg:"Cape & Islands", size:2, cost:30000, lab:"b", lvl:6, tags:["island", "tourist", "remote"], blurb:"Thirty miles out. Grey shingles, cobblestones, and fog you can lean on." },
 { id:"mvy", name:"Martha's Vineyard", lat:41.44, lon:-70.6, strip:2, water:"sea", reg:"Cape & Islands", size:2, cost:28000, lab:"b", lvl:6, tags:["island", "tourist"], blurb:"Gingerbread cottages and a summer crowd that arrives by the planeload." },
 { id:"pvd", name:"Providence", lat:41.835, lon:-71.42, strip:2, water:"sea", reg:"Rhode Island", size:4, cost:32000, lab:"l", lvl:6, tags:["city", "market", "capitol"], blurb:"Head of Narragansett Bay. Coffee milk, a marble dome, and tugs on the river." },
 { id:"npt", name:"Newport", lat:41.5, lon:-71.29, strip:2, water:"sea", reg:"Rhode Island", size:2, cost:26000, lab:"r", lvl:6, tags:["tourist", "coast", "island"], blurb:"Mansions on the cliff walk and more sailboats than parking spaces." },
 { id:"bid", name:"Block Island", lat:41.18, lon:-71.58, strip:1, water:"sea", reg:"Rhode Island", size:1, cost:22000, lab:"b", lvl:6, tags:["island", "tourist", "remote"], blurb:"Twelve miles out. One town, one ferry landing, bicycles everywhere." },
 { id:"gon", name:"New London", lat:41.34, lon:-72.13, strip:2, water:"sea", reg:"Connecticut", size:3, cost:26000, lab:"t", lvl:6, tags:["coast", "city"], blurb:"Submarines, the Coast Guard Academy, and ferries in every direction." },
 { id:"hvn", name:"New Haven", lat:41.32, lon:-72.93, strip:2, water:"sea", reg:"Connecticut", size:3, cost:28000, lab:"t", lvl:6, tags:["city", "coast"], blurb:"A green, a university, and an argument about who invented the hamburger." },
 { id:"bdl", name:"Hartford", lat:41.76, lon:-72.7, strip:2, water:null, reg:"Connecticut", size:4, cost:30000, lab:"l", lvl:6, tags:["city", "capitol"], blurb:"The insurance capital, on the Connecticut River." },
 { id:"ysj", name:"Saint John", lat:45.3, lon:-66.08, strip:2, water:"sea", reg:"Canada", size:3, cost:24000, lab:"l", lvl:8, tags:["city", "coast", "customs"], blurb:"New Brunswick's port city on the Bay of Fundy, where the river runs backwards twice a day." },
 { id:"yqi", name:"Yarmouth", lat:43.84, lon:-66.13, strip:2, water:"sea", reg:"Canada", size:2, cost:22000, lab:"r", lvl:8, tags:["coast", "lobster", "customs"], blurb:"The ferry landing for Nova Scotia. Lobster boats in every color there is." },
 { id:"yqb", name:"Quebec City", lat:46.85, lon:-71.28, strip:2, water:"lake", reg:"Canada", size:4, cost:36000, lab:"l", lvl:8, tags:["city", "capitol", "customs"], blurb:"A walled city on a cliff over the St. Lawrence. Bring your French." },
 { id:"yul", name:"Montreal", lat:45.64, lon:-73.66, strip:2, water:"lake", reg:"Canada", size:5, cost:50000, lab:"r", lvl:8, tags:["city", "market", "customs"], blurb:"An island city in the St. Lawrence. The longest runway and the best bagels on the map." }
];
// Hangars (h) build, sell and store planes; boatyards (m) do the same for boats. Only some towns have one.
const YARDS = { pwm:'hm', rkd:'hm', bgr:'h', aug:'h', pqi:'h', gnr:'h', bbh:'m', bhb:'m', sto:'m', jon:'m',
  psm:'hm', mht:'h', btv:'h', bos:'hm', glo:'m', ewb:'m', hya:'hm', pvd:'hm', gon:'m', bdl:'h', ysj:'m', yul:'h' };
PORTS.forEach(p => { p.yard = YARDS[p.id] || ''; });
// shorter names for the map, where every letter costs room
const MAP_SHORT = { lew:'Lewiston', bbh:'Boothbay', gls:'Grand Lake', chm:'Chamberlain', sug:'Carrabassett', pqi:'Presque Isle', iah:'Isle au Haut', mlt:'Millinocket', efk:'Newport VT', mvy:'Vineyard', pvc:'P-town', cnw:'N. Conway', bid:'Block Is.' };
PORTS.forEach(p => { p.mapName = MAP_SHORT[p.id] || p.name; });
const PART_NAMES = { plane: ['Airframe', 'Engine', 'Controls'], boat: ['Hull', 'Engine', 'Wheelhouse'] };
const PART_FRAC = 0.22;        // one part costs about this share of a new craft: three parts come to two thirds
const SHELF_REFRESH = 300;     // a yard gets new parts in once a game day
const STORE_CAP = 6;           // craft that fit in storage


/* ---------- craft ----------
   plane: wheels 0|1|2 (min strip it needs), floats, light (grounded by storms)
   boat : small (stays in for storms), fish 'in'|'off'|null, hold (fish units)
   speed km/s of game time, range km, fuel $/km */
const CRAFT = [
 { id:'cub', lvl:1,     cls:'plane', name:'Puddle Jumper',   price:1400,   pax:1,  cargo:1,  speed:6.5,  range:230, fuel:0.10, wheels:1, floats:false, light:true,  spr:'cub',
   desc:'Two seats, rag wings, older than your father. Lands on anything flat-ish.' },
 { id:'loon', lvl:2,    cls:'plane', name:'Loon 185',        price:4200,   pax:2,  cargo:1,  speed:7.5,  range:300, fuel:0.14, wheels:0, floats:true,  light:true,  spr:'loon',
   desc:'Floatplane. Lakes and harbors only, which in Maine is plenty.' },
 { id:'wagon', lvl:4,   cls:'plane', name:'Bush Wagon',      price:7500,   pax:3,  cargo:2,  speed:8.5,  range:380, fuel:0.18, wheels:1, floats:false, light:true,  spr:'wagon',
   desc:'Six-seat hauler on fat tires. The pickup truck of the north woods.' },
 { id:'beav', lvl:6,    cls:'plane', name:'Old Beav',        price:16000,  pax:4,  cargo:4,  speed:7.5,  range:420, fuel:0.24, wheels:0, floats:true,  light:true,  spr:'beav',
   desc:'Radial-engine floatplane. Loud, slow, carries a moose (quartered).' },
 { id:'twin', lvl:8,    cls:'plane', name:'Island Twin',     price:30000,  pax:7,  cargo:3,  speed:9.5,  range:500, fuel:0.30, wheels:1, floats:false, light:false, spr:'twin',
   desc:'Two engines, short-field legs, shrugs off weather that grounds the little fellas.' },
 { id:'amphib', lvl:11,  cls:'plane', name:'Caravan Amphib',  price:62000,  pax:8,  cargo:6,  speed:10.5, range:650, fuel:0.40, wheels:2, floats:true,  light:false, spr:'amphib',
   desc:'Turbine on amphibious floats: pavement or water, take your pick.' },
 { id:'otter', lvl:14,   cls:'plane', name:'Allagash Otter',  price:120000, pax:14, cargo:8,  speed:10,   range:700, fuel:0.55, wheels:1, floats:false, light:false, spr:'otter',
   desc:'Twin turboprop that lands on gravel bars. The County\'s lifeline.' },
 { id:'commuter', lvl:17,cls:'plane', name:'County Commuter', price:260000, pax:26, cargo:10, speed:13,   range:900, fuel:0.80, wheels:2, floats:false, light:false, spr:'commuter',
   desc:'A proper airliner, more or less. Pavement only.' },
 { id:'skiff', lvl:1,   cls:'boat',  name:'28\' Lobster Boat', price:1800,  pax:1,  cargo:3,  hold:4,  speed:2.6, range:190, fuel:0.06, small:true,  fish:'in',  spr:'skiff',
   desc:'Secondhand, sound, smells like bait. Hauls freight or traps inshore.' },
 { id:'down', lvl:3,    cls:'boat',  name:'38\' Downeaster',  price:9000,   pax:2,  cargo:6,  hold:9,  speed:3.5, range:280, fuel:0.10, small:true,  fish:'in',  spr:'down',
   desc:'Built in Jonesport, goes like a scalded cat.' },
 { id:'mail', lvl:5,    cls:'boat',  name:'Mail Boat',        price:14000,  pax:10, cargo:6,  hold:0,  speed:3.0, range:240, fuel:0.12, small:false, fish:null,  spr:'mail',
   desc:'Passengers, parcels and gossip. Runs in weather the lobster boats won\'t.' },
 { id:'dragger', lvl:9, cls:'boat',  name:'65\' Dragger',     price:42000,  pax:0,  cargo:10, hold:20, speed:2.8, range:520, fuel:0.20, small:false, fish:'off', spr:'dragger',
   desc:'Steel offshore boat. Reaches the ledges for groundfish, halibut and tuna.' },
 { id:'ferry', lvl:12,   cls:'boat',  name:'Island Ferry',     price:85000,  pax:24, cargo:16, hold:0,  speed:2.7, range:320, fuel:0.30, small:false, fish:null,  spr:'ferry',
   desc:'Carries the whole island and its pickup trucks. Never in a hurry.' },
 { id:'freight', lvl:15, cls:'boat',  name:'Coastal Freighter',price:150000, pax:0,  cargo:44, hold:0,  speed:2.5, range:900, fuel:0.45, small:false, fish:null,  spr:'freight',
   desc:'Everything the islands and Downeast need, a deckload at a time.' }
];
const CRAFT_BY = {}; CRAFT.forEach(c => CRAFT_BY[c.id] = c);

/* ---------- upgrades (cost = pct of craft price, min) ---------- */
const UPGRADES = [
 { id:'ifr',    cls:'plane', name:'Instruments',  pct:0.35, min:900,  desc:'Fly in fog.' },
 { id:'skis',   cls:'plane', name:'Wheel-skis',   pct:0.25, min:700,  desc:'Land on frozen lakes in winter.', ok:c => c.wheels === 1 || c.floats },
 { id:'tundra', cls:'plane', name:'Tundra tires', pct:0.20, min:600,  desc:'Use grass and gravel strips in mud season.', ok:c => c.wheels === 1 },
 { id:'engine', cls:'plane', name:'Engine tune',  pct:0.40, min:1000, desc:'+20% speed.' },
 { id:'pod',    cls:'plane', name:'Cargo pod',    pct:0.45, min:1200, desc:'+50% cargo room.' },
 { id:'radar',  cls:'boat',  name:'Radar',        pct:0.30, min:700,  desc:'Full speed in fog.' },
 { id:'diesel', cls:'boat',  name:'Bigger diesel',pct:0.40, min:900,  desc:'+20% speed.' },
 { id:'deck',   cls:'boat',  name:'Deck racks',   pct:0.45, min:1000, desc:'+50% cargo room.' },
 { id:'hauler', cls:'boat',  name:'Better gear',  pct:0.35, min:900,  desc:'+25% catch, faster hauling.', ok:c => !!c.fish }
];

/* ---------- fish ---------- price $/unit; abundance & price multiplier by season [spring, summer, fall, winter] */
const FISH = {
 lobster: { name:'Lobster',   price:70,  abund:[0.55, 1.0, 1.1, 0.3],  pm:[1.2, 0.8, 1.0, 1.55], off:false, col:'#d8482f' },
 scallop: { name:'Scallops',  price:125, abund:[0.5, 0, 0, 1.0],       pm:[1.0, 1, 1, 1.0],      off:false, col:'#f1e3c4' },
 haddock: { name:'Haddock',   price:52,  abund:[1.0, 0.8, 0.9, 0.7],   pm:[1.0, 1.0, 1.0, 1.2],  off:true,  col:'#9fb2bf' },
 halibut: { name:'Halibut',   price:150, abund:[0.55, 0.4, 0, 0],      pm:[1.0, 1.1, 1, 1],      off:true,  col:'#7a8a5c' },
 tuna:    { name:'Bluefin',   price:420, abund:[0, 0.22, 0.18, 0],     pm:[1, 1.0, 1.15, 1],     off:true,  col:'#3a5a8c' }
};
// grounds: sp = richness per species
const GROUNDS = [
 { id:'casco',  name:'Casco Bay Ledges',  lat:43.60, lon:-70.05, sp:{ lobster:0.9 } },
 { id:'musc',   name:'Muscongus Bay',     lat:43.87, lon:-69.37, sp:{ lobster:1.0, scallop:0.6 } },
 { id:'twobush',name:'Two Bush Channel',  lat:43.96, lon:-69.00, sp:{ lobster:1.05, scallop:0.7 } },
 { id:'seal',   name:'Matinicus Rock',    lat:43.79, lon:-68.80, sp:{ lobster:1.25, halibut:0.5 } },
 { id:'jericho',name:'Jericho Bay',       lat:44.12, lon:-68.53, sp:{ lobster:1.15, scallop:0.9 } },
 { id:'moosa',  name:'Moosabec Reach',    lat:44.46, lon:-67.50, sp:{ lobster:1.1, scallop:0.8 } },
 { id:'quoddy', name:'Cobscook Tides',    lat:44.80, lon:-66.90, sp:{ scallop:1.3, lobster:0.7 } },
 { id:'jeff',   name:'Jeffreys Ledge',    lat:43.10, lon:-70.08, sp:{ haddock:1.0, tuna:0.8 } },
 { id:'platts', name:'Platts Bank',       lat:43.17, lon:-69.58, sp:{ haddock:1.15, tuna:1.0, halibut:0.7 } },
 { id:'mdrock', name:'Mount Desert Rock', lat:43.93, lon:-68.10, sp:{ halibut:1.0, tuna:1.1, haddock:0.9 } },
 { id:'stell',  name:'Stellwagen Bank',   lat:42.35, lon:-70.35, sp:{ haddock:0.9, tuna:1.05 } },
 { id:'ccbay',  name:'Cape Cod Bay',      lat:41.90, lon:-70.32, sp:{ lobster:0.9, scallop:0.5 } },
 { id:'shoals', name:'Nantucket Shoals',  lat:41.12, lon:-69.75, sp:{ scallop:1.2, haddock:0.8 } },
 { id:'vsound', name:'Vineyard Sound',    lat:41.40, lon:-70.92, sp:{ lobster:0.8, scallop:0.95 } },
 { id:'bisound',name:'Block Island Sound',lat:41.24, lon:-71.80, sp:{ lobster:1.0, tuna:0.6 } },
 { id:'lisound',name:'The Race',          lat:41.22, lon:-72.10, sp:{ lobster:0.85, scallop:0.5 } },
 { id:'georges',name:'Georges Bank',      lat:41.45, lon:-67.90, sp:{ scallop:1.4, haddock:1.3, halibut:0.8 } }
];
// what each sea port pays relative to base
const MARKET_MULT = { pwm:1.15, rkd:1.0, vin:0.9, mat:0.82, mon:0.85, iah:0.8, sto:1.05, bbh:0.95, bhb:1.05, jon:0.95, epm:0.95,
  psm:1.05, bos:1.3, glo:1.05, ewb:1.15, pvc:0.95, hya:1.0, ack:0.9, mvy:0.9, pvd:1.15, npt:1.05, bid:0.85, gon:1.0, hvn:1.1, ysj:1.0, yqi:0.9 };

/* ---------- standing ---------- */
const STANDING = [ { xp:0, name:'From Away' }, { xp:15, name:'Summer Person' }, { xp:60, name:'Year-Rounder' }, { xp:160, name:'Local' }, { xp:400, name:'Finest Kind' } ];
const RANKS = [ [0,'Dooryard Operation'], [6000,'Going Concern'], [30000,'Known Up and Down the Coast'], [120000,'Regional Outfit'], [450000,'Statewide Institution'], [1000000,'Finest Kind'] ];

/* ---------- names & flavor ---------- */
const BOAT_NAMES = ['Miss Bev','Hard Tellin\'','Ayuh II','Wicked Good','Three Sons','Bottom Dollar','Lori Ann','Fog Cutter','Sea Smoke','Dry Ki','Second Mortgage','Numb As A Hake','Marjorie B.','Stern Man','Gunkhole','Rugged Individual','Some Good','High Tide Heidi','Cunnin\'','Daybreak'];
const PLANE_NAMES = ['Blackfly One','The Loon','Nor\'easter','Tin Goose','Mud Hen','Ruby','Spruce Budworm','Old Reliable-ish','Pine Tree Flyer','Cribbage Board','Moxie','Whiskey Jack','Mainah','North Star','Dirigo','Katahdin Queen','Bean Supper','Frost Heave'];
// flavor: "label|key"  (pax key = portrait look, cargo key = icon)
const FLAVOR = {
 pax: {
  any:   ['A selectman|suit','The visiting nurse|nurse','A county agent|suit','Cousin from away|tourist','A game warden|guide','The new schoolteacher|any','A fiddler bound for a contra dance|any','Somebody\'s grandmother|elder','A lobsterman\'s nephew|fisher','An insurance adjuster|suit','A reporter from the weekly|any','A woman with a cat carrier|any','The plow driver, off duty|cap','A retired sea captain|elder'],
  city:  ['Doctor\'s appointment in town|elder','A legislator, in a hurry|suit','Jury duty|any','Basketball player|kid','A fella seeing the bank|cap','College kid going back|kid'],
  island:['Island kid home from school|kid','The island minister|suit','A sternman looking for work|fisher','Missed the ferry, again|cap','The appliance repairman|cap','A homesick islander|fisher'],
  tourist:{ 1:['Summer person (too much luggage)|tourist','A fella from Massachusetts|tourist','Honeymooner|tourist','A birder with a long lens|tourist','Plein-air painter|tourist','Sunburned yachtsman|tourist'], 2:['Late-season tourist|tourist','Retiree in fleece|elder'], 0:['Off-season bargain hunter|tourist'], 3:['A writer wanting solitude|any'] },
  ski:   { 3:['Skier|skier','Ski patrol relief|skier','Snowboarder with one enormous duffel|skier','College ski racer|skier'] },
  leaf:  { 2:['Leaf-peeper|tourist','Foliage photographer|tourist','Lost half of a bus tour|elder'] },
  hunt:  { 2:['Moose hunter with a lucky permit|hunter','Bird hunter (setter rides free)|hunter','Deer camp regular|hunter'] },
  camp:  { 0:['Ice-out angler|guide','A sport with a fly rod|guide'], 1:['Camp kid|kid','Registered Maine guide|guide','Canoe tripper|guide','Headed upta camp|cap'] },
  sled:  { 3:['Snowmobiler|sled','Ice fisherman and his auger|hunter','Sled dog handler|sled'] }
 },
 cargo: {
  any:   ['Mail sack|mail','Engine parts|parts','Hardware store order|box','Newspapers|paper','A woodstove|stove','Chainsaw parts|parts','Whoopie pies|pie','That bitter soda nobody from away likes|soda','Bean supper fixings|grocery','Red hot dogs|box','Library books|books','Town office paperwork|paper'],
  toIsland:['Propane tank|propane','Groceries for the island store|grocery','A new outboard|outboard','Prescription run|box','Lumber|lumber','Diesel drum|drum','Sheetrock|lumber','A refrigerator|fridge','Bait barrel|barrel'],
  fromLobster:['Lobster crate|lobster','Picked crab meat|tote','Rope and buoys|crate','Lobster crate (lively)|lobster'],
  toCamp:['Camp supplies|crate','A canoe|canoe','Outboard gas|drum','Cedar shingles|lumber','Firewood, somehow|lumber'],
  fromWoods:['Fly-tying order|box','Smoked trout|tote','Moose meat, tagged|cooler','Balsam pillows|box','Maple syrup|syrup'],
  potato:{ 2:['Potatoes|potato','More potatoes|potato','Broccoli|crate'], 0:['Fiddleheads|crate','Seed potatoes|potato','Maple syrup|syrup'], 1:['New potatoes|potato'], 3:['Ployes mix|potato','Storage potatoes|potato'] },
  downeast:{ 1:['Wild blueberries|berries'], 3:['Balsam wreath|wreath','Christmas tree|tree'], 2:['Cranberries|berries'], 0:['Elvers, under guard|eel'] },
  scallop:{ 3:['Scallops on ice|scallop'] },
  toCity:['Tax returns|paper','Samples for the state lab|cooler','A transmission for rebuilding|parts','Antiques for the dealer|crate']
 }
};
const NEWS_IDLE = [
 'Selectmen table motion to fix the Main Street pothole for the 14th consecutive year.',
 'Summer visitor asks if the island closes in winter. Islanders decline to comment.',
 'You can\'t get there from here. Unless you call us.',
 'Bean supper Saturday at the Grange. Bring your own opinion.',
 'Local man says this is nothing, you should have seen the winter of \'98.',
 'Black flies expected to be "about average," which is to say biblical.',
 'Lobsterman reports best season ever, tells IRS it was the worst.',
 'Town meeting runs four hours; plow truck purchase approved by three votes.',
 'Moose reported standing in Route 201, considering its options.',
 'Frost heave on the camp road now officially has a name.',
 'Mail boat captain knows who you got a letter from before you do.',
 'Woman from away lives here 40 years; obituary will note she was "from away."',
 'Whoopie pie declared a food group by unanimous consent.',
 'Old-timer says fog\'s so thick the gulls are walking.',
 'Dump to be renamed "transfer station." Everyone will keep calling it the dump.',
 'Registered Maine Guide refuses to reveal fishing spot, even under oath.',
 'Potato field rock pile enters its fifth generation.',
 'Harbor seal steals bait, shows no remorse.'
];
// seasonal contract templates (from/to are port ids); k = 'p' | 'c'
const CONTRACT_TEMPLATES = [
 { s:SUMMER, from:'vin', to:'rkd', k:'c', title:'Lobster Festival', ic:'lobster', what:'lobster crates', text:'The festival tent in Rockland steams twenty thousand pounds a weekend. Vinalhaven co-op is selling; somebody has to haul.' },
 { s:SUMMER, from:'pwm', to:'bhb', k:'p', title:'Acadia Rush', ic:'tourist', what:'tourists', text:'Every hotel on Mount Desert is full and the visitors keep coming. The chamber will pay to keep them off Route 1.' },
 { s:SUMMER, from:'pwm', to:'rng', k:'p', title:'Camp Drop-off Week', ic:'kid', what:'camp kids', text:'Six weeks of canoes and bug juice. Parents will pay anything. Truly anything.' },
 { s:SUMMER, from:'jon', to:'pwm', k:'c', title:'Blueberry Rake', ic:'berries', what:'wild blueberries', text:'The barrens are blue. Flats of berries need to be in Portland before they turn to jam on their own.' },
 { s:SUMMER, from:'rkd', to:'mon', k:'p', title:'Artists\' Colony', ic:'tourist', what:'painters', text:'Monhegan\'s summer workshop starts Monday. Easels extra.' },
 { s:SUMMER, from:'sto', to:'pwm', k:'c', title:'Shedder Season', ic:'lobster', what:'lobster crates', text:'Stonington is landing more soft-shell than the trucks can take.' },
 { s:FALL,   from:'pqi', to:'pwm', k:'c', title:'Potato Harvest', ic:'potato', what:'potatoes', text:'The whole County is digging. Barrels are stacked to the rafters and the buyer is in Portland.' },
 { s:FALL,   from:'bgr', to:'chm', k:'p', title:'Moose Week', ic:'hunter', what:'moose hunters', text:'Permit winners need to be in the Allagash by Monday dawn, rifles and coolers and all.' },
 { s:FALL,   from:'pwm', to:'gnr', k:'p', title:'Peak Foliage', ic:'tourist', what:'leaf-peepers', text:'Moosehead is at peak color and the inns have rooms for exactly four days.' },
 { s:FALL,   from:'fkt', to:'bgr', k:'c', title:'Valley Harvest', ic:'potato', what:'potatoes', text:'St. John Valley potatoes for the Bangor processor. They do not keep forever.' },
 { s:FALL,   from:'bgr', to:'jkm', k:'p', title:'Deer Camp', ic:'hunter', what:'hunters', text:'Same camp, same crew, same argument about the stove, forty years running.' },
 { s:FALL,   from:'mat', to:'rkd', k:'c', title:'Fall Run', ic:'lobster', what:'lobster crates', text:'Matinicus is hauling hard before the weather turns. Price is up; get it ashore.' },
 { s:WINTER, from:'pwm', to:'sug', k:'p', title:'Powder Day', ic:'skier', what:'skiers', text:'Three feet at Sugarloaf and the access road is a parking lot. Fly them over it.' },
 { s:WINTER, from:'jon', to:'pwm', k:'c', title:'Wreath Season', ic:'wreath', what:'balsam wreaths', text:'Downeast makes the wreaths for half of America. They ship now or never.' },
 { s:WINTER, from:'rkd', to:'mat', k:'c', title:'Winter Provisions', ic:'grocery', what:'island supplies', text:'Matinicus sees the state ferry a few times a month in winter. The store shelves are getting philosophical.' },
 { s:WINTER, from:'bgr', to:'fkt', k:'p', title:'Sled Dog Race', ic:'sled', what:'mushers and fans', text:'The big race starts on Main Street in Fort Kent. Everybody wants to be there; nobody wants to drive it.' },
 { s:WINTER, from:'epm', to:'pwm', k:'c', title:'Scallop Days', ic:'scallop', what:'scallops on ice', text:'Cobscook day-boat scallops, the best there are. Portland chefs are pacing.' },
 { s:WINTER, from:'bgr', to:'mlt', k:'p', title:'Sledders\' Weekend', ic:'sled', what:'snowmobilers', text:'The trails out of Millinocket are groomed like a highway. Riders are stuck at the airport.' },
 { s:SPRING, from:'pqi', to:'pwm', k:'c', title:'Fiddlehead Rush', ic:'crate', what:'fiddleheads', text:'Two weeks a year, and the restaurants lose their minds. Keep them cold.' },
 { s:SPRING, from:'bgr', to:'gls', k:'p', title:'Ice-Out', ic:'guide', what:'anglers', text:'The ice went out of West Grand yesterday. Salmon are up top and so, shortly, is every sport in New England.' },
 { s:SPRING, from:'rkd', to:'vin', k:'c', title:'Trap Lumber', ic:'lumber', what:'trap stock and rope', text:'Every fisherman on Vinalhaven is rebuilding gear at once.' },
 { s:SPRING, from:'bbh', to:'pwm', k:'c', title:'Elver Run', ic:'eel', what:'glass eels', text:'Two thousand dollars a pound and they have to arrive alive. The buyer rides along and does not blink.' },
 { s:SPRING, from:'pwm', to:'gnr', k:'p', title:'Opening Camp', ic:'cap', what:'camp owners', text:'Time to take the shutters off and find out what the mice did.' },
 { s:SPRING, from:'aug', to:'iah', k:'c', title:'Town Meeting', ic:'paper', what:'ballots and warrants', text:'Democracy arrives by mail boat, or it would if the mail boat were running.' }
];
// where you can set up shop: three ports, four small craft (the Pocket Planes opening)
const STARTS = [
 { id:'casco', name:'Casco Bay', sub:'Portland \u00b7 Lewiston-Auburn \u00b7 Boothbay Harbor', blurb:'City money and short hops. The busiest job boards in the state, plus a floatplane to reach Boothbay.', ports:['pwm','lew','bbh'], craft:[['cub','pwm'],['cub','lew'],['loon','pwm'],['skiff','pwm']], view:[300,425] },
 { id:'penobscot', name:'Penobscot Bay', sub:'Rockland \u00b7 Vinalhaven \u00b7 Matinicus', blurb:'Island lifelines. Short runs that pay well, lobster on the doorstep, and weather with opinions.', ports:['rkd','vin','mat'], craft:[['cub','rkd'],['cub','vin'],['skiff','rkd'],['skiff','vin']], view:[380,400] },
 { id:'bangor', name:'Queen City', sub:'Bangor \u00b7 Augusta \u00b7 Bar Harbor', blurb:'The inland hub. Longer legs, bigger fares, Bar Harbor\'s summer crowds, and one boat for the fishing.', ports:['bgr','aug','bhb'], craft:[['cub','bgr'],['cub','aug'],['cub','bhb'],['skiff','bhb']], view:[400,352] }
];
// The tutorial's seven stages, in order. Each is ticked off in G.tut as the player gets through it.
const TUT_PHASES = ['intro', 'sent', 'fish', 'collect', 'loop', 'yard', 'ports'];
