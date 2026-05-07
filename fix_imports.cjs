const fs = require('fs');
const path = require('path');

const filesToFix = [
  'utils.jsx',
  'pages/WorkerHistory.jsx',
  'pages/TaskDetail.jsx',
  'pages/SocialReview.jsx',
  'pages/PromoterMissionManager.jsx',
  'pages/MyCampaigns.jsx',
  'pages/CreateSocialTask.jsx',
  'pages/CreateCampaign.jsx',
  'pages/CreateAd.jsx',
  'Layout.jsx'
];

for (const relPath of filesToFix) {
  const fullPath = path.join(__dirname, relPath);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;
  
  // Replace const { supabase } = await import("@/supabase");
  content = content.replace(/const\s+\{\s*supabase\s*\}\s*=\s*await\s+import\("@\/supabase"\);/g, '');
  
  // Replace const { supabase: sb } = await import("@/supabase");
  content = content.replace(/const\s+\{\s*supabase\s*:\s*sb\s*\}\s*=\s*await\s+import\("@\/supabase"\);/g, 'const sb = supabase;');
  
  // Replace await (await import("@/supabase")).supabase
  content = content.replace(/await\s+\(await\s+import\("@\/supabase"\)\)\.supabase/g, 'supabase');
  
  // Layout.jsx specific: import("@/supabase").then(({ supabase }) => {
  content = content.replace(/import\("@\/supabase"\)\.then\(\(\{\s*supabase\s*\}\)\s*=>\s*\{/g, '(() => {');
  
  // Add static import if not exists
  if (content !== originalContent && !content.includes('import { supabase } from "@/supabase"')) {
    content = 'import { supabase } from "@/supabase";\n' + content;
  }
  
  fs.writeFileSync(fullPath, content);
}
console.log('Fixed imports');
