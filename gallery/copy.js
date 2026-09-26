/* Press kit: "Copy caption" buttons copy the caption beside them. */
(function () {
  var buttons = document.querySelectorAll('[data-copy]');
  for (var i = 0; i < buttons.length; i += 1) {
    buttons[i].addEventListener('click', function (event) {
      var button = event.currentTarget;
      var source = document.getElementById(button.getAttribute('data-copy'));
      if (!source || !navigator.clipboard) return;
      navigator.clipboard.writeText(source.textContent).then(function () {
        var label = button.textContent;
        button.textContent = 'Copied';
        window.setTimeout(function () { button.textContent = label; }, 1600);
      });
    });
  }
})();
