//middlewares/employeeProfileUpload.js
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const dir = path.join(__dirname, '../upload/hrss/profile-images')
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const unique = `emp-${Date.now()}${path.extname(file.originalname)}`
    cb(null, unique)
  }
})

const upload = multer({ storage })
module.exports = upload
