/**
 * Entry point for EV ChargeAdmin Dashboard
 */
import { initFirebase, addNewUser, seedInitialFirestoreData } from './dashboard.js';
import './dashboard-ui.js';

function bootstrap() {
  // Initialize Firebase & Listeners
  initFirebase();

  // Attach Add User Form listener
  const userForm = document.getElementById('add-user-form');
  if (userForm) {
    userForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('user-name')?.value;
      const rfid_tag = document.getElementById('user-rfid')?.value;
      const balance = document.getElementById('user-balance')?.value;
      const is_active = document.getElementById('user-active')?.checked;
      const email = document.getElementById('user-email')?.value;

      const success = await addNewUser({ name, rfid_tag, balance, is_active, email });
      if (success) {
        userForm.reset();
        const activeCheck = document.getElementById('user-active');
        if (activeCheck) activeCheck.checked = true;
      }
    });
  }

  // Attach Add Charger Form listener
  const chargerForm = document.getElementById('add-charger-form');
  if (chargerForm) {
    chargerForm.addEventListener('submit', window.submitAddCharger);
  }

  // Tab switching (Chargers vs Users vs Commands vs Transactions)
  const tabButtons = document.querySelectorAll('[data-tab-target]');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab-target');
      
      // Update button active styles
      tabButtons.forEach(b => {
        b.classList.remove('bg-emerald-600', 'text-white', 'shadow-emerald-950');
        b.classList.add('bg-slate-800/80', 'text-slate-400', 'hover:text-slate-200');
      });
      btn.classList.remove('bg-slate-800/80', 'text-slate-400', 'hover:text-slate-200');
      btn.classList.add('bg-emerald-600', 'text-white', 'shadow-emerald-950');

      // Scroll to view or filter
      const section = document.getElementById(targetId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
