window.addEventListener('DOMContentLoaded', (event) => {
  const toc = document.getElementById('toc');
  const headers = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

  headers.forEach((header) => {
    const link = document.createElement('a');
    link.textContent = header.textContent;
    link.href = '#' + header.id;
    toc.appendChild(link);
  });
});
