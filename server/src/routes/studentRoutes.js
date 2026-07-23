const express = require('express');
const router = express.Router();

const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getFilterOptions,
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');
const { uploadStudentPhoto } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { studentValidator } = require('../validators/studentValidators');

router.use(protect);

router.get('/meta/filters', getFilterOptions);

router
  .route('/')
  .get(getStudents)
  .post(uploadStudentPhoto.single('photo'), studentValidator, validate, createStudent);

router
  .route('/:id')
  .get(getStudentById)
  .put(uploadStudentPhoto.single('photo'), updateStudent)
  .delete(authorize('SUPER_ADMIN', 'ADMIN'), deleteStudent);

module.exports = router;
