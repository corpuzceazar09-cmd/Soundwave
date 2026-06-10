const mongoose = require('mongoose');

const podcastEditSchema = new mongoose.Schema({
  podcast_id: { type: String, required: true, index: true },
  editor_id: { type: String, required: true },
  editor_name: { type: String, default: '' },
  previous_values: {
    title: String,
    author: String,
    description: String,
    language: String,
  },
  new_values: {
    title: String,
    author: String,
    description: String,
    language: String,
  },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PodcastEdit', podcastEditSchema);
