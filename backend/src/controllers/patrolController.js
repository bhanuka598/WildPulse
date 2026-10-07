const Patrol = require('../models/Patrol');

// Haversine formula to compute distance between waypoints in kilometers
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Compute total route distance across waypoints array
function computeTotalDistance(waypoints) {
  if (!waypoints || waypoints.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    if (prev.latitude && prev.longitude && curr.latitude && curr.longitude) {
      total += calculateHaversineDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
    }
  }
  return parseFloat(total.toFixed(2));
}

// POST /api/patrols/start
// Starts an assigned patrol and logs initial timestamp + starting coordinates
exports.startPatrol = async (req, res, next) => {
  try {
    const { patrolId, routeName, latitude, longitude } = req.body;
    const rangerId = req.user._id;

    let patrol;
    if (patrolId) {
      patrol = await Patrol.findById(patrolId);
      if (!patrol) {
        return res.status(404).json({ success: false, message: 'Patrol not found' });
      }
      patrol.status = 'IN_PROGRESS';
      patrol.startTime = patrol.startTime || new Date();
      if (latitude !== undefined && longitude !== undefined) {
        patrol.waypoints.push({
          latitude: Number(latitude),
          longitude: Number(longitude),
          timestamp: new Date(),
        });
      }
      await patrol.save();
    } else {
      // Create new patrol on the fly if no prior assignment
      const waypoints = [];
      if (latitude !== undefined && longitude !== undefined) {
        waypoints.push({
          latitude: Number(latitude),
          longitude: Number(longitude),
          timestamp: new Date(),
        });
      }
      patrol = await Patrol.create({
        rangerId,
        routeName: routeName || `Patrol-${new Date().toLocaleDateString()}`,
        status: 'IN_PROGRESS',
        startTime: new Date(),
        waypoints,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patrol started successfully',
      patrol,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/patrols/:id/waypoints
// Appends GPS breadcrumb batches to the patrol route
exports.addWaypoints = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { waypoints } = req.body; // array of { latitude, longitude, timestamp }

    if (!waypoints || !Array.isArray(waypoints) || waypoints.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Waypoints array is required',
      });
    }

    const patrol = await Patrol.findById(id);
    if (!patrol) {
      return res.status(404).json({ success: false, message: 'Patrol not found' });
    }

    const formattedWaypoints = waypoints.map((wp) => ({
      latitude: Number(wp.latitude),
      longitude: Number(wp.longitude),
      timestamp: wp.timestamp ? new Date(wp.timestamp) : new Date(),
    }));

    patrol.waypoints.push(...formattedWaypoints);
    patrol.distanceKm = computeTotalDistance(patrol.waypoints);
    await patrol.save();

    res.status(200).json({
      success: true,
      message: 'Waypoints appended successfully',
      waypointsCount: patrol.waypoints.length,
      distanceKm: patrol.distanceKm,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/patrols/:id/complete
// Marks status as 'COMPLETED', computes total distance, records ending timestamp and notes
exports.completePatrol = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes, finalWaypoints } = req.body;

    const patrol = await Patrol.findById(id);
    if (!patrol) {
      return res.status(404).json({ success: false, message: 'Patrol not found' });
    }

    if (finalWaypoints && Array.isArray(finalWaypoints) && finalWaypoints.length > 0) {
      const formatted = finalWaypoints.map((wp) => ({
        latitude: Number(wp.latitude),
        longitude: Number(wp.longitude),
        timestamp: wp.timestamp ? new Date(wp.timestamp) : new Date(),
      }));
      patrol.waypoints.push(...formatted);
    }

    patrol.status = 'COMPLETED';
    patrol.endTime = new Date();
    if (notes) patrol.notes = notes;
    patrol.distanceKm = computeTotalDistance(patrol.waypoints);
    await patrol.save();

    res.status(200).json({
      success: true,
      message: 'Patrol completed successfully',
      patrol,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/patrols
// Returns patrols with optional filters for status or ranger
exports.getPatrols = async (req, res, next) => {
  try {
    const { status, rangerId } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (rangerId) filter.rangerId = rangerId;

    const patrols = await Patrol.find(filter)
      .populate('rangerId', 'name email role phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: patrols.length,
      patrols,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/patrols/:id
// Returns single patrol details with linked waypoints
exports.getPatrolById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patrol = await Patrol.findById(id).populate('rangerId', 'name email role phone');

    if (!patrol) {
      return res.status(404).json({ success: false, message: 'Patrol not found' });
    }

    res.status(200).json({
      success: true,
      patrol,
    });
  } catch (error) {
    next(error);
  }
};
