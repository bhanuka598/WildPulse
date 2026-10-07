const FieldIncident = require('../models/FieldIncident');

// Helper to broadcast socket events safely
const broadcastSocketEvent = (req, event, data) => {
  const io = req.app.get('io');
  if (io) {
    io.emit(event, data);
  }
};

// POST /api/field-incidents
// Handles single incident reporting with image upload via Multer/Cloudinary. Broadcasts 'new_field_incident'.
exports.createFieldIncident = async (req, res, next) => {
  try {
    const {
      patrolId,
      incidentType,
      description,
      severity,
      latitude,
      longitude,
    } = req.body;

    const rangerId = req.user._id;

    // Collect uploaded image URLs
    const images = [];
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file) => {
        if (file.path) images.push(file.path);
      });
    } else if (req.file && req.file.path) {
      images.push(req.file.path);
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and Longitude are required',
      });
    }

    const incident = await FieldIncident.create({
      patrolId: patrolId || null,
      rangerId,
      incidentType,
      description,
      severity: severity || 'MEDIUM',
      location: {
        latitude: Number(latitude),
        longitude: Number(longitude),
      },
      images,
      isSyncedOffline: false,
    });

    const populatedIncident = await FieldIncident.findById(incident._id).populate(
      'rangerId',
      'name email role phone'
    );

    // Broadcast real-time alert via Socket.io
    broadcastSocketEvent(req, 'new_field_incident', populatedIncident);

    res.status(201).json({
      success: true,
      message: 'Field incident reported successfully',
      incident: populatedIncident,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/field-incidents/sync-bulk
// Receives an array of queued incidents created while offline.
// Saves all to MongoDB, sets isSyncedOffline: true, and returns synced IDs.
exports.syncBulkFieldIncidents = async (req, res, next) => {
  try {
    const { incidents } = req.body; // Array of incident objects
    const rangerId = req.user._id;

    if (!incidents || !Array.isArray(incidents) || incidents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Incidents array is required for bulk sync',
      });
    }

    const docsToInsert = incidents.map((inc) => ({
      patrolId: inc.patrolId || null,
      rangerId,
      incidentType: inc.incidentType || 'OTHER',
      description: inc.description || 'Offline recorded incident',
      severity: inc.severity || 'MEDIUM',
      location: {
        latitude: Number(inc.latitude || inc.location?.latitude || 0),
        longitude: Number(inc.longitude || inc.location?.longitude || 0),
      },
      images: inc.images || [],
      status: 'REPORTED',
      reportedAt: inc.timestamp ? new Date(inc.timestamp) : new Date(),
      isSyncedOffline: true,
    }));

    const inserted = await FieldIncident.insertMany(docsToInsert);
    const syncedIds = inserted.map((item) => item._id);

    // Populate and broadcast each synced incident
    const populated = await FieldIncident.find({ _id: { $in: syncedIds } }).populate(
      'rangerId',
      'name email role phone'
    );

    populated.forEach((doc) => {
      broadcastSocketEvent(req, 'new_field_incident', doc);
    });

    res.status(200).json({
      success: true,
      message: `Successfully synchronized ${inserted.length} offline field incidents`,
      syncedIds,
      count: inserted.length,
      incidents: populated,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/field-incidents
// Returns all reported field incidents with optional filters
exports.getFieldIncidents = async (req, res, next) => {
  try {
    const { status, severity, incidentType, patrolId } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (incidentType) filter.incidentType = incidentType;
    if (patrolId) filter.patrolId = patrolId;

    const incidents = await FieldIncident.find(filter)
      .populate('rangerId', 'name email role phone')
      .populate('patrolId', 'routeName status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: incidents.length,
      incidents,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/field-incidents/:id/status
// Updates incident resolution status
exports.updateFieldIncidentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['REPORTED', 'UNDER_INVESTIGATION', 'RESOLVED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be REPORTED, UNDER_INVESTIGATION, or RESOLVED',
      });
    }

    const incident = await FieldIncident.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('rangerId', 'name email role phone');

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Field incident not found' });
    }

    // Broadcast status change
    broadcastSocketEvent(req, 'field_incident_updated', incident);

    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      incident,
    });
  } catch (error) {
    next(error);
  }
};
