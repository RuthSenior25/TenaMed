const express = require('express');
const router = express.Router();
const Prescription = require('../models/Prescription');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { checkRole, roles } = require('../middleware/roles');

// Get all prescriptions for the current patient
router.get('/', authenticate, checkRole([roles.PATIENT]), async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ 
      patientId: req.user._id 
    })
    .populate('doctorId', 'profile.firstName profile.lastName email')
    .populate('pharmacyId', 'pharmacyName email profile.phone')
    .sort({ prescribedDate: -1 });

    res.json({
      success: true,
      data: prescriptions
    });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescriptions',
      error: error.message
    });
  }
});

// Get prescriptions for pharmacy
router.get('/pharmacy', authenticate, checkRole([roles.PHARMACY]), async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ 
      pharmacyId: req.user._id 
    })
    .populate('patientId', 'profile.firstName profile.lastName email profile.phone')
    .populate('doctorId', 'profile.firstName profile.lastName email')
    .sort({ prescribedDate: -1 });

    res.json({
      success: true,
      data: prescriptions
    });
  } catch (error) {
    console.error('Error fetching pharmacy prescriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescriptions',
      error: error.message
    });
  }
});

// Get prescriptions for doctor
router.get('/doctor', authenticate, checkRole([roles.ADMIN, roles.GOVERNMENT]), async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ 
      doctorId: req.user._id 
    })
    .populate('patientId', 'profile.firstName profile.lastName email profile.phone')
    .populate('pharmacyId', 'pharmacyName email profile.phone')
    .sort({ prescribedDate: -1 });

    res.json({
      success: true,
      data: prescriptions
    });
  } catch (error) {
    console.error('Error fetching doctor prescriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescriptions',
      error: error.message
    });
  }
});

// Get single prescription
router.get('/:id', authenticate, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('doctorId', 'profile.firstName profile.lastName email')
      .populate('pharmacyId', 'pharmacyName email profile.phone')
      .populate('patientId', 'profile.firstName profile.lastName email');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    // Check if user has permission to view this prescription
    const hasPermission = 
      prescription.patientId._id.toString() === req.user._id.toString() ||
      prescription.doctorId._id.toString() === req.user._id.toString() ||
      prescription.pharmacyId._id.toString() === req.user._id.toString() ||
      req.user.role === 'admin';

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: prescription
    });
  } catch (error) {
    console.error('Error fetching prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescription',
      error: error.message
    });
  }
});

// Create new prescription (for doctors/admins/patients)
router.post('/', authenticate, checkRole([roles.ADMIN, roles.GOVERNMENT, roles.USER]), async (req, res) => {
  try {
    const {
      patientId,
      pharmacyId,
      drug,
      notes,
      duration
    } = req.body;

    // If patient is creating prescription, use their own ID
    const finalPatientId = req.user.role === 'user' ? req.user._id : patientId;

    // Validate required fields
    if (!finalPatientId || !pharmacyId || !drug || !drug.name || !drug.dosage || !drug.frequency) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify patient exists (only for non-patient creators)
    if (req.user.role !== 'user') {
      const patient = await User.findById(finalPatientId);
      if (!patient || patient.role !== 'user') {
        return res.status(400).json({
          success: false,
          message: 'Invalid patient'
        });
      }
    }

    // Verify pharmacy exists and is approved
    const pharmacy = await User.findById(pharmacyId);
    if (!pharmacy || pharmacy.role !== 'pharmacy' || !pharmacy.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or unapproved pharmacy'
      });
    }

    const prescription = new Prescription({
      patientId: finalPatientId,
      doctorId: req.user.role === 'user' ? null : req.user._id, // Patients can create prescriptions without a doctor
      pharmacyId,
      drug: {
        ...drug,
        refills: drug.refills || 0,
        refillsUsed: 0
      },
      notes,
      prescribedDate: new Date()
    });

    await prescription.save();

    const populatedPrescription = await Prescription.findById(prescription._id)
      .populate('doctorId', 'profile.firstName profile.lastName email')
      .populate('pharmacyId', 'pharmacyName email')
      .populate('patientId', 'profile.firstName profile.lastName email');

    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      data: populatedPrescription
    });
  } catch (error) {
    console.error('Error creating prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create prescription',
      error: error.message
    });
  }
});

// Request prescription refill (for patients)
router.post('/:id/refill', authenticate, checkRole([roles.PATIENT]), async (req, res) => {
  try {
    const { notes } = req.body;
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    // Check if prescription belongs to the patient
    if (prescription.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if refills are available
    if (prescription.drug.refillsUsed >= prescription.drug.refills) {
      return res.status(400).json({
        success: false,
        message: 'No refills remaining'
      });
    }

    await prescription.requestRefill(notes);

    const updatedPrescription = await Prescription.findById(prescription._id)
      .populate('doctorId', 'profile.firstName profile.lastName email')
      .populate('pharmacyId', 'pharmacyName email')
      .populate('patientId', 'profile.firstName profile.lastName email');

    res.json({
      success: true,
      message: 'Refill request submitted successfully',
      data: updatedPrescription
    });
  } catch (error) {
    console.error('Error requesting refill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request refill',
      error: error.message
    });
  }
});

// Approve/deny refill request (for pharmacies)
router.patch('/:id/refill/:requestIndex', authenticate, checkRole([roles.PHARMACY]), async (req, res) => {
  try {
    const { requestIndex } = req.params;
    const { status, notes } = req.body;

    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    // Check if prescription belongs to the pharmacy
    if (prescription.pharmacyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const request = prescription.refillRequests[requestIndex];
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Refill request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Refill request already processed'
      });
    }

    if (status === 'approved') {
      await prescription.approveRefill(parseInt(requestIndex), notes);
    } else if (status === 'rejected') {
      request.status = 'rejected';
      request.processedDate = new Date();
      request.notes = notes;
      prescription.status = 'active';
      await prescription.save();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const updatedPrescription = await Prescription.findById(prescription._id)
      .populate('doctorId', 'profile.firstName profile.lastName email')
      .populate('pharmacyId', 'pharmacyName email')
      .populate('patientId', 'profile.firstName profile.lastName email');

    res.json({
      success: true,
      message: `Refill request ${status} successfully`,
      data: updatedPrescription
    });
  } catch (error) {
    console.error('Error processing refill request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refill request',
      error: error.message
    });
  }
});

// Get approved pharmacies for prescription creation
router.get('/pharmacies/approved', authenticate, async (req, res) => {
  try {
    const pharmacies = await User.find({
      role: 'pharmacy',
      isApproved: true,
      isActive: true
    })
    .select('pharmacyName email profile.phone profile.address profile.city')
    .sort({ pharmacyName: 1 });

    res.json({
      success: true,
      data: pharmacies
    });
  } catch (error) {
    console.error('Error fetching approved pharmacies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pharmacies',
      error: error.message
    });
  }
});

module.exports = router;
