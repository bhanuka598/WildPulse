const WildlifeConflict = require('../models/WildlifeConflict');
const Alert = require('../models/Alert');

exports.createConflict = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (req.file) data.imageUrl = req.file.path;

    // Support coordinates sent as strings or numbers
    if (data.latitude) data.latitude = Number(data.latitude);
    if (data.longitude) data.longitude = Number(data.longitude);

    const conflict = await WildlifeConflict.create(data);

    // Auto-create alert for high-priority conflicts (Member 4 integration)
    if (['HUMAN_INJURY', 'LIVESTOCK_ATTACK', 'CROP_RAIDING'].includes(conflict.conflictType)) {
      try {
        await Alert.create({
          type: 'HIGH_RISK_ZONE',
          severity: conflict.conflictType === 'HUMAN_INJURY' ? 'CRITICAL' : 'HIGH',
          title: `Community conflict: ${conflict.conflictType}`,
          message: `${conflict.description} (Location: ${conflict.villageArea || 'Area'})`,
          latitude: conflict.latitude,
          longitude: conflict.longitude,
        });
      } catch (alertErr) {
        console.warn('Alert creation warning:', alertErr.message);
      }
    }

    res.status(201).json({ success: true, conflict, data: conflict });
  } catch (err) { next(err); }
};

exports.getConflicts = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.conflictType) filter.conflictType = req.query.conflictType;
    if (req.query.reporterPhone) filter.reporterPhone = req.query.reporterPhone;

    const conflicts = await WildlifeConflict.find(filter)
      .populate('assignedRanger', 'name email phone')
      .populate('reviewedBy', 'name email')
      .sort('-createdAt');
    res.json({ success: true, count: conflicts.length, conflicts, data: conflicts });
  } catch (err) { next(err); }
};

exports.getConflictById = async (req, res, next) => {
  try {
    const conflict = await WildlifeConflict.findById(req.params.id)
      .populate('assignedRanger', 'name email phone')
      .populate('reviewedBy', 'name email');
    if (!conflict) {
      return res.status(404).json({ success: false, message: 'Conflict report not found' });
    }
    res.json({ success: true, conflict, data: conflict });
  } catch (err) { next(err); }
};

exports.assignRanger = async (req, res, next) => {
  try {
    const update = {
      assignedRanger: req.body.rangerId,
      assignedAt: new Date(),
      status: 'ASSIGNED',
    };
    if (req.user) {
      update.reviewedBy = req.user._id;
      update.reviewedAt = new Date();
    }

    const conflict = await WildlifeConflict.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).populate('assignedRanger', 'name email phone')
     .populate('reviewedBy', 'name email');

    res.json({ success: true, conflict, data: conflict });
  } catch (err) { next(err); }
};

exports.updateConflictStatus = async (req, res, next) => {
  try {
    const update = {
      status: req.body.status,
    };
    if (req.body.resolutionNotes !== undefined) {
      update.resolutionNotes = req.body.resolutionNotes;
    }
    if (req.body.status === 'RESOLVED') {
      update.resolvedAt = new Date();
    }
    if (req.body.status === 'IN_PROGRESS' && !update.reviewedAt) {
      update.reviewedAt = new Date();
    }

    const conflict = await WildlifeConflict.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).populate('assignedRanger', 'name email phone')
     .populate('reviewedBy', 'name email');

    res.json({ success: true, conflict, data: conflict });
  } catch (err) { next(err); }
};