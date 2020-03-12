// jQuery for page scrolling feature
jQuery(document).ready(function(e) {
    e(".scroll").click(function(t) {
        t.preventDefault();
        e("html,body").animate({
            scrollTop: e(this.hash).offset().top
        }, 1e3)
    })
});
// Retrieve latest version of my CV
jQuery(document).ready(function () {
   $.getJSON("https://api.github.com/repos/amallia/cv-antoniomallia/releases").done(function (json) {
        var release = json[0];
        var downloadURL = release.assets[0].browser_download_url;
        $(".resume-link").attr("href", downloadURL);
   });
});
jQuery(document).ready(function () {
    $('.js-cite-modal').click(function(e) {
        e.preventDefault();
        let filename = $(this).attr('data-filename');
        let modal = $('#modal');
        modal.find('.modal-body code').load(
            filename,
            function(response, status, xhr) {
                if (status == 'error') {
                    let msg = "Error: ";
                    $('#modal-error').html(msg + xhr.status + " " + xhr.statusText);
                } else {
                    $('.js-download-cite').attr('href', filename);
                }
            });
        modal.modal('show');
    });
    $('.js-copy-cite').click(function(e) {
        e.preventDefault();
        let range = document.createRange();
        let code_node = document.querySelector('#modal .modal-body');
        range.selectNode(code_node);
        window.getSelection().addRange(range);
        try {
            document.execCommand('copy');
        } catch (e) {
            console.log('Error: citation copy failed.');
        }
        window.getSelection().removeRange(range);
    });
});
