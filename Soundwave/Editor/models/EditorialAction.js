const mongoose = require('mongoose');

const editorialActionSchema = new mongoose.Schema({
  episode_id: { type: String, required: true, index: true },
  action: {
    type: String,
    required: true,
    enum: ['published', 'hidden', 'drafted', 'edited', 'featured', 'unfeatured'],
  },
  editor_id: { type: String, required: true },
  editor_name: { type: String, default: '' },
  notes: { type: String, default: '' },
  previous_status: {
    type: String,
    enum: ['published', 'draft', 'hidden', null],
    default: null,
  },
  new_status: {
    type: String,
    enum: ['published', 'draft', 'hidden', null],
    default: null,
  },
  episode_title: { type: String, default: '' },
  podcast_title: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('EditorialAction', editorialActionSchema);
