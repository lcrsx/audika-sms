Update Todos
⎿  ☒ Fix broken application and restore working state
☒ Ensure database connection works with new credentials
☒ Fix chat page profile loading error - 'Ett fel uppstod vid inläsning av profilen'
☒ Fix patient page flickering/auto-refresh issue making editing impossible
☒ Clean up console logs from SMS page
☒ Clean up console logs from patient page
☒ Redesign 'Dina Senaste Meddelanden' in SMS page as beautiful big card under 'Skicka SMS' card
☒ Fix SMS page UX/UI for recent messages section
☒ Fix chat page TypeError: Cannot read properties of undefined (reading 'toUpperCase') at line 334
☒ Fix 'Exportera' button on /hem page - doesn't work/do anything when clicked
☒ Fix chat page error 'Ogiltigt användarnamn' when trying to access
☒ Continue improving historik page UX/UI with modern design
☒ Fix message status display - show sent/delivered/failed instead of always 'pending'
☒ Integrate proper Infobip status updates instead of showing 'pending'
☒ Implement simple SMS status logic: 'Sent' immediately, 'Delivered' after 60s, 'Failed' for errors
☒ CRITICAL: Remove ALL SMS simulation/mock functionality - production only uses real Infobip API
☒ Add template selection with autofill functionality on SMS page
☒ Remove 'framgångsgrad' stats from SMS page specifically
☒ Fix DialogContent warning on /hem when clicking eye icon for patient details - Missing Description or aria-describedby
☒ Remove 'autoskapad' from historik - not clear what it means
☒ Remove 'alla status' filtering from historik and other pages
☒ Remove all 'framgångsgrad' (success rate) stats from entire application
☒ Relocate back button on /historik page to better position
☒ Remove/minify 'Databas: Ansluten & Synkroniserad' section from SMS page
☒ Remove hardcoded 'Databas synkroniserad ✓' badge - looks fake
☐ Fix authentication 403 error for OTP verification
☐ Fix Runtime Error when clicking on user from footer
☐ Make message sender clearer in historik - unclear who sent message to patient
☐ Fix historik auto-updates performance issue - optimize for 300 concurrent users
☐ CRITICAL: Make SMS page the absolute best SMS sending page ever created
☐ Redesign SMS stats to be in a row layout instead of boxed
☐ Fix notifications to be tied to logged-in user and properly clear when user chooses
☐ Add visible logout button to the application
☐ Implement 2-hour auto-logout for inactive users using Supabase auth
☐ CRITICAL: Optimize entire app UX/UI for 300 concurrent users - performance is key
☐ Implement pagination for all data lists to handle large datasets
☐ Add virtualized scrolling for long lists (patients, messages, etc)
☐ Optimize database queries with proper indexes and limits
☐ Implement lazy loading for non-critical components
☐ Implement debouncing for all search inputs
☐ Add request caching and memoization where appropriate
☐ Fix auth-form console spam 'Token has expired or is invalid' during OTP verification
☐ Fix Jest worker error - 2 child process exceptions exceeding retry limit
☐ Fix header navigation - doesn't list all pages
☐ Fix 'Inställningar' button in header - doesn't lead anywhere
☐ Add floating 'scroll to top' button on every page
☐ Fix broken hover UX/UI when searching for patients/users
☐ Remove dropdown menu from header user section
☐ Make header avatar larger and clickable (along with name) to go to user profile
☐ Remove 'inställningar' from header dropdown since it's handled in user profile
☐ Add loading skeletons instead of spinners for better perceived performance
☐ Implement user search functionality
☐ Implement VIP patient marking system
☐ Implement direct user messaging
☐ Enhance export button on /hem to allow users to select what to export
☐ Fix clickable hover effect on /hem cards like 'aktiva patienter' - should they be clickable?
☐ Fix broken CSS styling on /historik page - down left of UI above footer
☐ Run build and lint to ensure everything works
