const axios = require('axios');

async function updateImageUrls() {
  try {
    // Get all courses
    const response = await axios.get('http://localhost:5000/api/courses');
    const courses = response.data;
    
    console.log('Current courses:', courses);
    
    // Update each course to use relative URLs
    for (const course of courses) {
      if (course.image_url && course.image_url.startsWith('http://localhost:5000/')) {
        const relativeUrl = course.image_url.replace('http://localhost:5000', '');
        console.log(`Updating course ${course.id}: ${course.image_url} -> ${relativeUrl}`);
        
        // Update the course
        await axios.put(`http://localhost:5000/api/courses/${course.id}`, {
          ...course,
          image_url: relativeUrl
        });
      }
    }
    
    console.log('Image URLs updated successfully!');
  } catch (error) {
    console.error('Error updating image URLs:', error);
  }
}

updateImageUrls(); 