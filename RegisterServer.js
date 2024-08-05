//
const express = require("express");
const mysql = require("mysql");
const multer = require("multer");
const app = express();
app.use(express.urlencoded({ extended: true }));

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "mysql",
  database: "userdb",
});

db.connect((err) => {
  if (err) throw err;
  console.log("MySQL Connected...");
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/registerTest.html");
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post("/users", upload.single("profilePicture"), (req, res) => {
  if (!req.file) {
    return res.status(400).send('Nenhum arquivo foi enviado.');
  }
  
  const imageBuffer = req.file.buffer; 
  const { fullname, gender, dob, phone, email, password } = req.body;

  const sql = `
    INSERT INTO Registration_Table (Fullname, Gender, dob, phone, email, password, profilePicture)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [fullname, gender, dob, phone, email, password, imageBuffer], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: err });
    }
    res.send(`User registered successfully`);
  });
});

app.listen(3000);
