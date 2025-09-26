# Add Filters and Sorting to My Replies Tab

## Implementation Plan

### Requirements
- **Filters needed:**
  - New Replies (only replies not skipped) - essentially `status IN ('pending', 'approved', 'edited')`
  - Skipped - `status = 'skipped'`
  - Posted - `status = 'posted'`
  - By target - filter by `monitoring_target_id` from curated_posts

- **Sorting options:**
  - Score - sort by `curated_posts.total_score` DESC
  - Recency - sort by `created_at` DESC (current default)

### Architecture Design

#### 1. Create RepliesFilters Component
- Location: `components/replies/replies-filters.tsx`
- Features:
  - Filter buttons for status (New, Skipped, Posted, All)
  - Dropdown for target selection
  - Sorting dropdown (Score, Recency)
  - Clear filters button

#### 2. Create Filter State Management
- Use React state to manage active filters
- Pass filter state to ModernRepliesList as props
- Update database query to support filtering and sorting

#### 3. Update ModernRepliesList
- Accept filter and sort props
- Apply client-side filtering and sorting
- Maintain current date grouping functionality

#### 4. Update Home Page
- Add RepliesFilters component above ModernRepliesList
- Update database query to fetch all needed data for filtering
- Pass filter state between components

### Implementation Steps ✅ COMPLETED

1. ✅ **Create RepliesFilters component** with all filter/sort controls
   - Created `components/replies/replies-filters.tsx`
   - Includes status filter buttons (All, New Replies, Skipped, Posted) with counts
   - Target dropdown for filtering by monitoring target
   - Sort dropdown for Score vs Recency
   - Clear filters functionality

2. ✅ **Update database query** in home page to fetch monitoring target names
   - Updated Supabase query to include monitoring_targets relation
   - Added separate query to fetch all active monitoring targets for dropdown
   - Fixed data transformation to handle nested monitoring_targets properly

3. ✅ **Add filter state management** in home page
   - Created `components/replies/replies-with-filters.tsx` wrapper component
   - Handles client-side filter state using React useState
   - Calculates reply counts for each status filter
   - Applies filtering and sorting logic

4. ✅ **Integrate filters into home page**
   - Replaced ModernRepliesList with RepliesWithFilters component
   - Passes all required props including monitoring targets
   - Maintains existing functionality while adding filters

5. ✅ **Testing and TypeScript fixes**
   - Fixed TypeScript errors in data transformation
   - Removed unused imports to pass linting
   - Build succeeds successfully

### Changes Made

#### New Files Created:
- `components/replies/replies-filters.tsx` - Filter/sort UI component
- `components/replies/replies-with-filters.tsx` - Container component with state management

#### Files Modified:
- `app/(authenticated)/home/page.tsx` - Updated database queries and component usage

### Filter Functionality

#### Status Filters:
- **All**: Shows all replies
- **New Replies**: Shows replies with status 'pending', 'approved', or 'edited' (not skipped)
- **Skipped**: Shows replies with status 'skipped'
- **Posted**: Shows replies with status 'posted'

#### Target Filter:
- Dropdown showing all active monitoring targets
- Filters replies by the target they originated from

#### Sorting Options:
- **Most Recent**: Sorts by created_at DESC (default)
- **Highest Score**: Sorts by total_score DESC

#### UI Features:
- Badge counts showing number of replies in each status
- Clear filters button when filters are active
- Responsive filter controls
- Maintains existing date grouping in ModernRepliesList
- **Modern card-based design** with gradient background
- **Icons for each filter type** for better visual recognition
- **Grid layout** for status buttons that takes full width
- **Consistent spacing and typography** for professional appearance
- No bottom border - filters are contained within a card component

### Modern Design Updates ✅ COMPLETED

- ✅ **Added icons to all filter options**:
  - Inbox icon for "All Replies"
  - Archive icon for "New Replies"
  - X icon for "Skipped"
  - Send icon for "Posted"
  - Target icon for monitoring targets dropdown
  - Clock icon for "Most Recent" sorting
  - TrendingUp icon for "Highest Score" sorting

- ✅ **Improved layout and styling**:
  - Replaced border-bottom with card container
  - Added subtle gradient background
  - Made filter buttons wider using grid layout (2 columns on mobile, 4 on desktop)
  - Increased button height for better touch targets
  - Enhanced spacing and typography
  - Added proper icons to dropdown selectors

- ✅ **Enhanced user experience**:
  - Better visual hierarchy with larger header
  - Improved accessibility with larger touch targets
  - Modern card design that fits current UI patterns
  - Consistent iconography throughout the component

This implementation provides comprehensive filtering and sorting with a modern, professional design that enhances the user experience while maintaining excellent functionality.