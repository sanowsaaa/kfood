
// Scroll to top utility - мигновено превъртане при смяна на страници
export const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'instant'
  });
};
