// Test script for AI B-roll workflow
// Run with: node test-ai-broll.js YOUR_SERPAPI_KEY
// Or set SERPAPI_KEY environment variable

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Get API key from command line or environment
function getAPIKey() {
  const serpApiKey = process.argv[2] || process.env.SERPAPI_KEY;

  if (!serpApiKey) {
    console.error('[Test] ERROR: No SerpAPI key provided');
    console.error('[Test] Usage: node test-ai-broll.js YOUR_SERPAPI_KEY');
    console.error('[Test] Or set SERPAPI_KEY environment variable');
    process.exit(1);
  }

  return serpApiKey;
}

// Test transcript from Whisper (from previous session)
const testTranscript = `Gauntlet is a productivity tool designed to boost your efficiency and streamline your workflow. It combines powerful features with an intuitive interface to help you get more done in less time.`;

// Test scenes (simulating GPT-4 output from previous session)
const testScenes = [
  {
    topic: "productivity workspace",
    timestamp: "0:05",
    description: "B-roll of organized workspace to illustrate productivity"
  },
  {
    topic: "computer typing",
    timestamp: "0:10",
    description: "B-roll of hands typing on keyboard for workflow concept"
  },
  {
    topic: "time management",
    timestamp: "0:15",
    description: "B-roll of clock or timer for efficiency theme"
  }
];

async function testGoogleImagesSearch(query, serpApiKey) {
  console.log(`\n[Test] Searching Google Images for: "${query}"`);

  try {
    const response = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google_images',
        q: query,
        api_key: serpApiKey,
        num: 5,
      },
    });

    const images = response.data.images_results || [];
    console.log(`[Test] Found ${images.length} image results`);

    if (images.length > 0) {
      const topResults = images.slice(0, 3);
      topResults.forEach((img, idx) => {
        console.log(`  ${idx + 1}. ${img.title || 'Untitled'}`);
        console.log(`     URL: ${img.original}`);
        console.log(`     Source: ${img.source}`);
      });

      return topResults.map(img => img.original).filter(Boolean);
    }

    return [];
  } catch (error) {
    console.error(`[Test] Google Images search error:`, error.message);
    if (error.response) {
      console.error(`[Test] Response data:`, error.response.data);
    }
    return [];
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('AI B-roll Workflow Test');
  console.log('='.repeat(60));

  // Get API key
  console.log('\n[Test] Loading SerpAPI key...');
  const serpApiKey = getAPIKey();
  console.log('[Test] SerpAPI key loaded successfully');

  // Test Google Images search for each scene
  console.log('\n[Test] Testing Google Images search for each B-roll scene:');
  console.log('-'.repeat(60));

  const allResults = [];

  for (const scene of testScenes) {
    const imageUrls = await testGoogleImagesSearch(scene.topic, serpApiKey);

    if (imageUrls.length > 0) {
      allResults.push({
        topic: scene.topic,
        timestamp: scene.timestamp,
        urls: imageUrls
      });
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Total scenes tested: ${testScenes.length}`);
  console.log(`Scenes with results: ${allResults.length}`);
  console.log(`Total image URLs found: ${allResults.reduce((sum, r) => sum + r.urls.length, 0)}`);

  if (allResults.length > 0) {
    console.log('\n[Test] SUCCESS: Google Images search is working!');
    console.log('[Test] Next step: Test downloading these images to project folder');
  } else {
    console.log('\n[Test] WARNING: No images found for any scene');
    console.log('[Test] This could indicate an issue with SerpAPI or search queries');
  }
}

main().catch(error => {
  console.error('\n[Test] Fatal error:', error);
  process.exit(1);
});
