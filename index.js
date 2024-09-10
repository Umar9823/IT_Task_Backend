const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer'); // For handling file uploads

// Initialize Firebase Admin SDK
const serviceAccount = require('./taskmanagemet-65588-firebase-adminsdk-2lol3-bffd414061.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'taskmanagemet-65588.appspot.com' // Replace with your Firebase Storage bucket
});

const db = admin.firestore();
const bucket = admin.storage().bucket(); // Initialize Firebase Storage

const app = express();
const port = 5000;

app.use(cors()); // Allow CORS for React app
app.use(bodyParser.json());

// Set up multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory for processing
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit files to 5MB
});

// Route to add a new task
app.post('/addTask', async (req, res) => {
  try {
    const taskData = req.body;

    // Save the task to Firestore
    const docRef = await db.collection('tasks').add(taskData);

    // Respond with the task ID
    res.status(200).send({ message: 'Task added successfully', id: docRef.id });
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).send({ message: 'Error adding task' });
  }
});

// Route to update a task (Actual End Date and optional photo upload)
app.post('/updateTask/:taskId', upload.single('photo'), async (req, res) => {
  try {
    const { taskId } = req.params;
    const { actualEndDate } = req.body;
    let updatedData = { actualEndDate };

    // If a photo file is provided, upload it to Firebase Storage
    if (req.file) {
      const file = req.file;
      const fileName = `photos/${taskId}_${file.originalname}`;
      const fileRef = bucket.file(fileName);

      // Upload the file to Firebase Storage
      await fileRef.save(file.buffer, {
        metadata: { contentType: file.mimetype },
      });

      // Get the public URL of the uploaded photo
      const photoURL = await fileRef.getSignedUrl({
        action: 'read',
        expires: '03-01-2500', // Set a far future expiration date
      });

      // Add the photo URL to the update
      updatedData.photoURL = photoURL[0];
    }

    // Update the task in Firestore
    await db.collection('tasks').doc(taskId).update(updatedData);

    // Respond with success
    res.status(200).send({ message: 'Task updated successfully' });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).send({ message: 'Error updating task' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
