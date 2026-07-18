# AI Feature Spec: [Feature Name]

## 1. Feature Overview

**Description:** [A 2-3 sentence summary of the specific feature slice being built in this iteration.]
**Business Value:** [Why we are adding this right now, helping the AI understand the primary goal.]

## 2. Current System State (Crucial)

_Context about what already exists in the codebase so the AI avoids reinventing the wheel._

- Existing Infrastructure: [e.g., The app uses Supabase Auth. The active user is available via the useUser hook.]
- Existing UI Components: [e.g., Use our existing Button and Card components from @/components/ui/.]
- Database State: [e.g., The users table already exists with id, name, and email columns.]

## 3. Scope & Boundaries

_Explicitly draw the line between this feature and the rest of the application._

- IN SCOPE (Do this now):
  - [e.g., Add an avatar_url column to the users table.]
  - [e.g., Build the UI component for the user to upload an image file.]
- DEFERRED (Do NOT do this yet - saved for future tickets):
  - DO NOT [e.g., implement image cropping and resizing.]
  - DO NOT [e.g., build the public-facing profile view.]

## 4. Interfaces & Data Contracts

_Provide exact shapes for props, API responses, or DB schemas to prevent the AI from guessing._

- Expected API Payload:
  { "userId": "string", "fileUrl": "string" }

- Component Props Needed:
  interface AvatarUploadProps {
  currentUrl: string | null;
  onUploadComplete: (newUrl: string) => void;
  }

## 5. Git & Version Control Rules

_Instructions for how the agent should handle branching and committing._

- Base Branch: [e.g., Branch off from 'dev' and ensure you pull latest changes first.]
- Branch Naming Convention: [e.g., feature/ai-[ticket-ID]-brief-description]
- Target Branch Name: [e.g., feature/ai-auth-123-avatar-upload]
- Commit Standard: [e.g., Use Conventional Commits. Commits must be atomic per step.] CRITICAL: dont mention the ai agent name or or brand used
- Final Action: [e.g., Push to remote and output the git push command used.]

## 6. File Operations

_Direct the agent exactly where to work._

- Create:
  - [filepath] - [Brief purpose]
- Modify:
  - [filepath] - [What exactly to change, e.g., Add <AvatarUpload /> below the email field.]

## 7. Implementation Steps

_Provide a suggested sequence of operations for the agent to follow._

1. Step 1: [e.g., Checkout the new branch.]
2. Step 2: [e.g., Update the database schema/types to support the new data.]
3. Step 3: [e.g., Create the server action/API route for handling the upload.]
4. Step 4: [e.g., Build the React component and connect it to the action.]
5. Step 5: [e.g., Integrate the new component into the parent page and commit.]

## 8. Error Handling & Edge Cases

_How the system should behave when things go wrong within this specific feature._

- If [condition A]: [e.g., The file is > 5MB, show a red toast error saying "File too large".]
- If [condition B]: [e.g., The network request fails, leave the old avatar in place and do not update the DB.]

## 9. Acceptance Criteria

_Verifiable facts that prove this specific feature slice is complete._

- [ ] [e.g., The code is pushed to the remote branch feature/auth-123-avatar-upload.]
- [ ] [e.g., The uploaded image successfully saves to the storage bucket.]
- [ ] [e.g., The users table updates with the new URL.]
- [ ] [e.g., The UI optimistically updates to show the new avatar immediately.]
