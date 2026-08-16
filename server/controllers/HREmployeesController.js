const User = require('../models/User');
const Department = require('../models/Department');
const bcrypt = require('bcryptjs');

// @desc    Get all employees with filtering and search
// @route   GET /api/hr/employees
// @access  Private (HR only)
const getHREmployees = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    if (!req.user || req.user.user_type !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR access required.'
      });
    }

    // Get filter parameters
    const { department = 'all', position = 'all', search = '', page = 1, limit = 10 } = req.query;

    // Start building the query
    let query = {};

    // Apply department filter
    if (department !== 'all') {
      query.department_id = department;
    }

    // Apply search
    if (search) {
      query.$or = [
        { first_name: new RegExp(search, 'i') },
        { last_name: new RegExp(search, 'i') },
        { user_id: new RegExp(search, 'i') },
        { position: new RegExp(search, 'i') }
      ];
    }

    // Apply user type filter
    if (position !== 'all') {
      query.user_type = position;
    }

    // Get paginated results
    const options = {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      populate: 'department_id',
      sort: { createdAt: -1 }
    };

    const users = await User.paginate(query, options);

    // Get all departments for the filter dropdown
    const departments = await Department.find();

    // Get unique positions for the filter dropdown
    const positions = await User.distinct('position');

    res.json({
      success: true,
      users: users.docs,
      pagination: {
        total: users.totalDocs,
        pages: users.totalPages,
        page: users.page,
        limit: users.limit
      },
      departments,
      positions,
      filters: {
        department,
        position,
        search
      }
    });
  } catch (error) {
    console.error('Error fetching HR employees:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching employees'
    });
  }
};

// @desc    Create a new employee
// @route   POST /api/hr/employees
// @access  Private (HR only)
const createHREmployee = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    if (!req.user || req.user.user_type !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR access required.'
      });
    }

    // Validate the request
    const { 
      user_id, 
      first_name, 
      last_name, 
      middle_initial, 
      email, 
      department_id, 
      position, 
      start_date, 
      salary, 
      user_type,
      appointment_status,
      part_time_weekly_hours,
      solo_parent
    } = req.body;

    // Validate user_type
    const validUserTypes = ['employee', 'hr', 'department_admin', 'mayor'];
    if (!validUserTypes.includes(user_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type. Must be one of: employee, hr, department_admin, mayor'
      });
    }

    // Check if user_id or email already exists
    const existingUser = await User.findOne({
      $or: [
        { user_id },
        { email }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User ID or email already exists'
      });
    }

    // Hash the default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt); // Default password

    // Create the user
    const user = new User({
      user_id,
      first_name,
      last_name,
      middle_initial,
      email,
      department_id,
      position,
      start_date,
      salary,
      user_type,
      appointment_status: appointment_status || 'permanent',
      part_time_weekly_hours: part_time_weekly_hours !== undefined && part_time_weekly_hours !== null && part_time_weekly_hours !== ''
        ? Math.min(40, Math.max(0, parseFloat(part_time_weekly_hours)))
        : null,
      solo_parent: solo_parent === true || solo_parent === 'true',
      password: hashedPassword,
      // Force a password change on first login — the default password is public
      mustChangePassword: true
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Employee added successfully',
      user
    });
  } catch (error) {
    console.error('Error creating HR employee:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating employee'
    });
  }
};

// @desc    Get a specific employee
// @route   GET /api/hr/employees/:id
// @access  Private (HR only)
const getHREmployee = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    if (!req.user || req.user.user_type !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR access required.'
      });
    }

    const { id } = req.params;

    // Find the user
    const user = await User.findById(id).populate('department_id');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching HR employee:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching employee'
    });
  }
};

// @desc    Update an employee
// @route   PUT /api/hr/employees/:id
// @access  Private (HR only)
const updateHREmployee = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    if (!req.user || req.user.user_type !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR access required.'
      });
    }

    const { id } = req.params;
    const { 
      user_id, 
      first_name, 
      last_name, 
      middle_initial, 
      email, 
      department_id, 
      position, 
      start_date,      salary,
      user_type,
      appointment_status,
      part_time_weekly_hours,
      solo_parent
    } = req.body;

    // Validate user_type
    const validUserTypes = ['employee', 'hr', 'department_admin', 'mayor'];
    if (!validUserTypes.includes(user_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type. Must be one of: employee, hr, department_admin, mayor'
      });
    }

    // Validate appointment_status
    const validAppointmentStatuses = ['permanent', 'temporary', 'co_terminus', 'contractual', 'casual', 'job_order', 'elected_official', 'other'];
    if (appointment_status && !validAppointmentStatuses.includes(appointment_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment status'
      });
    }

    // Find the user
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Store the old user_id to check if it changed
    const oldUserId = user.user_id;

    // Check if user_id or email already exists (excluding current user)
    const existingUser = await User.findOne({
      $or: [
        { user_id },
        { email }
      ],
      _id: { $ne: id }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User ID or email already exists'
      });
    }

    // Update the user
    user.user_id = user_id;
    user.first_name = first_name;
    user.last_name = last_name;
    user.middle_initial = middle_initial;
    user.email = email;
    user.department_id = department_id;
    user.position = position;
    user.start_date = start_date;
    user.salary = salary;
    user.user_type = user_type;
    if (appointment_status) user.appointment_status = appointment_status;      if (part_time_weekly_hours !== undefined && part_time_weekly_hours !== null && part_time_weekly_hours !== '') {
        user.part_time_weekly_hours = Math.min(40, Math.max(0, parseFloat(part_time_weekly_hours)));
      } else if (part_time_weekly_hours === '' || part_time_weekly_hours === null) {
        user.part_time_weekly_hours = null;
      }
      if (solo_parent !== undefined && solo_parent !== null) {
        user.solo_parent = solo_parent === true || solo_parent === 'true';
      }

      await user.save();

    // If user_id was changed, update all related leave requests
    if (oldUserId !== user_id) {
      const LeaveRequest = require('../models/LeaveRequest');
      
      // Update user_id in leave requests
      await LeaveRequest.updateMany(
        { user_id: oldUserId },
        { user_id: user_id }
      );
      
      // Also update department_approved_by and hr_approved_by fields if they match the old user_id
      await LeaveRequest.updateMany(
        { department_approved_by: oldUserId },
        { department_approved_by: user_id }
      );
      
      await LeaveRequest.updateMany(
        { hr_approved_by: oldUserId },
        { hr_approved_by: user_id }
      );
      
      // Update LeaveRecommendation records
      const LeaveRecommendation = require('../models/LeaveRecommendation');
      await LeaveRecommendation.updateMany(
        { department_admin_id: oldUserId },
        { department_admin_id: user_id }
      );
      
      // Update LeaveApproval records
      const LeaveApproval = require('../models/LeaveApproval');
      await LeaveApproval.updateMany(
        { hr_manager_id: oldUserId },
        { hr_manager_id: user_id }
      );
    }

    res.json({
      success: true,
      message: 'Employee updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating HR employee:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating employee'
    });
  }
};

// @desc    Delete an employee
// @route   DELETE /api/hr/employees/:id
// @access  Private (HR only)
const deleteHREmployee = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    if (!req.user || req.user.user_type !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR access required.'
      });
    }

    const { id } = req.params;

    // Find the user
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if this is the only HR user
    if (user.user_type === 'hr') {
      const hrCount = await User.countDocuments({ user_type: 'hr' });
      if (hrCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last HR user'
        });
      }
    }

    // Get the user_id to delete related records
    const userId = user.user_id;

    // Delete related leave requests
    const LeaveRequest = require('../models/LeaveRequest');
    await LeaveRequest.deleteMany({ user_id: userId });

    // Delete related leave recommendations
    const LeaveRecommendation = require('../models/LeaveRecommendation');
    await LeaveRecommendation.deleteMany({ department_admin_id: userId });

    // Delete related leave approvals
    const LeaveApproval = require('../models/LeaveApproval');
    await LeaveApproval.deleteMany({ hr_manager_id: userId });

    // Delete the user
    await User.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting HR employee:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting employee'
    });
  }
};

module.exports = {
  getHREmployees,
  createHREmployee,
  getHREmployee,
  updateHREmployee,
  deleteHREmployee
};