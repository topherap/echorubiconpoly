console.log('[Theme] Enhancer loaded');

// Fix dropdown rendering issues
document.addEventListener('DOMContentLoaded', function() {
  // Ensure dropdowns are visible
  const selects = document.querySelectorAll('select');
  selects.forEach(select => {
    select.addEventListener('click', function(e) {
      e.stopPropagation();
      this.focus();
    });
  });
});