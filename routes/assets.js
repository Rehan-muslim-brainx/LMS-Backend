const express = require('express');
const router = express.Router();
const CompanyAsset = require('../models/CompanyAsset');
const auth = require('../middleware/auth');

// Get company logo
router.get('/logo', async (req, res) => {
  try {
    const logo = await CompanyAsset.getLogo();
    res.json(logo);
  } catch (error) {
    console.error('Get logo error:', error);
    res.status(500).json({ message: 'Error fetching logo' });
  }
});

// Update company logo (admin only)
router.put('/logo', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { logoData } = req.body;
    
    if (!logoData) {
      return res.status(400).json({ message: 'Logo data is required' });
    }

    const updatedLogo = await CompanyAsset.updateLogo(logoData);
    
    if (!updatedLogo) {
      return res.status(500).json({ message: 'Error updating logo' });
    }

    res.json(updatedLogo);
  } catch (error) {
    console.error('Update logo error:', error);
    res.status(500).json({ message: 'Error updating logo' });
  }
});

// Get all company assets (admin only)
router.get('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const assets = await CompanyAsset.getAllAssets();
    res.json(assets);
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({ message: 'Error fetching assets' });
  }
});

module.exports = router; 