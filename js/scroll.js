$(window).scroll(function () {
    $('.scrollReveal').each(function () {
        var imagePos = $(this).offset().top - 310;
        var imageHeight = $(this).height();
        var topOfWindow = $(window).scrollTop();
        if (imagePos < topOfWindow + imageHeight && imagePos + imageHeight > topOfWindow) {
            $(this).addClass("typewriter");
        } 
    });
});