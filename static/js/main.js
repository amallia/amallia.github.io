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