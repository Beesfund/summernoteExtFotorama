(function (factory) {
  /* global define */
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node/CommonJS
    module.exports = factory(require('jquery'));
  } else {
    // Browser globals
    factory(window.jQuery);
  }
}(function ($) {

  /**
   * @param {Object} context - context object has status of editor.
   */
  var fotorama = function(context) {
    var self = this;

    var options = context.options;

    // ui has renders to build ui elements.
    //  - you can create a button with `ui.button`
    var ui = $.summernote.ui;
    var $editor = context.layoutInfo.editor;
    var lang = options.langInfo;
    var cssRules = '\
      .note-editable .fotorama * {\
        pointer-events: none;\
      }\
      .note-editable .fotorama {\
        width: 360px;\
        height: 240px;\
      }\
      .note-editable .fotorama div, .note-editable .fotorama img {\
        max-width: 300px;\
        max-height: 200px;\
        top: 0 !important;\
      }\
      .note-editable .fotorama:hover{\
        opacity: 0.8;\
        cursor: pointer;\
      }\
      .summernoteExtFotorama .option-label {\
        width: 130px !important;\
      }\
    ';

    // Create a fotorama button to be used in the toolbar
    context.memo('button.fotorama', function() {
        var button = ui.button({
            contents: '<i class="fa"/><span class="glyphicon glyphicon-camera"></span>',
            tooltip: lang.fotorama.tooltip,
            click: function() {
                self.addGallery();
            }
        });
        return button.render();
    });

    // This events will be attached when editor is initialized.
    this.events = {
      // This will be called after modules are initialized.
      'summernote.init': function () {
        self.initializeGalleries();
      }
    };

    this.initialize = function() {
      var $container = options.dialogsInBody ? $(document.body) : $editor;
      self.createFotoramaDialog($container);
    };

    this.destroy = function() {
      ui.hideDialog(self.$dialog);
      self.$dialog.remove();
    };

    this.initializeGalleries = function() {
        $('<style>').prop('type', 'text/css').html(cssRules).appendTo('head');

        $editor.on('click', '.fotorama', function(event) {
            event.preventDefault();
            var galleries = self.getEditorGalleries();
            var index = galleries.index(this);
            self.editGallery(index);
            return false;
        });
    };

    /********************     MAIN FUNCTIONS     ********************/

    this.createFotoramaDialog = function($container) {
        var $fotoramaContainer = $('<div class="summernoteExtFotorama">').appendTo($container);

        var fotoramaMainDialogConfig = this.getFotoramaMainDialogConfig();
        var fotoramaOptionsDialogConfig = this.getFotoramaOptionsDialogConfig();
        var fotoramaCaptionDialogConfig = this.getFotoramaCaptionDialogConfig();

        //mainDialog
        self.$dialog = ui.dialog(fotoramaMainDialogConfig).render().appendTo($fotoramaContainer);
        self.$dialog.css({
            'z-index': '2000',
            'height': '100%'
        });
        self.$removeBtn = self.$dialog.find('#btn-remove');
        self.$optionsBtn = self.$dialog.find('#btn-options');
        self.$saveBtn = self.$dialog.find('#btn-save');
        self.$imageInput = self.$dialog.find('#image-input');
        self.$imgPreviewList = self.$dialog.find('#image-url-list');

        //optionsDialog
        self.$optionsDialog = ui.dialog(fotoramaOptionsDialogConfig).render().appendTo($fotoramaContainer);
        self.$optionsDialog.css({
            'z-index': '2100'
        });
        self.$optionsDialog.children().css({
            width: 640
        });
        self.$saveOptionsBtn = self.$optionsDialog.find('#btn-save-options');

        //captionDialog
        self.$captionDialog = ui.dialog(fotoramaCaptionDialogConfig).render().appendTo($fotoramaContainer);
        self.$captionDialog.css({
            'z-index': '2200'
        });
        self.$captionDialog.children().css({
            'top': 50,
            'width': 400
        });
        self.$captionInput = self.$captionDialog.find('#caption-input');
        self.$cancelCaptionBtn = self.$captionDialog.find('#btn-cancel-caption');
        self.$saveCaptionBtn = self.$captionDialog.find('#btn-save-caption');
    };

    this.initializeFotoramaDialog = function(isNewGallery) {
        this.clearDialog();
        var gallery = self.gallery;

        if(isNewGallery)
            self.$removeBtn.hide();
        else
            self.$removeBtn.show();

        //set options values
        $.each(gallery.inputOptions, function() {
            self.setOptionInput(this, gallery.attr[this]);
        });
        $.each(gallery.radioOptions, function() {
            self.setOptionRadioInput(this, gallery.attr[this]);
        });

        //create imgPreviewList
        $.each (gallery.images, function() {
            self.$imgPreviewList.append(self.createImagePreview(this));
        });
        self.$imgPreviewList.sortable({
            start: function(event, ui) {
                $(this).attr('data-previndex', ui.item.index());
            },
            update: function(event, ui) {
                var newIndex = ui.item.index();
                var oldIndex = $(this).attr('data-previndex');
                $(this).removeAttr('data-previndex');
                self.gallery.shiftImage(oldIndex, newIndex);
            }
        });
    };

    this.showFotoramaDialog = function(gallery, isNewGallery) {
        self.gallery = gallery;

        this.initializeFotoramaDialog(isNewGallery);

        return $.Deferred(function(deferred) {
            ui.onDialogShown(self.$dialog, function() {
                context.triggerEvent('dialog.shown');
                self.$imageInput.focus();
                $('.modal-backdrop').css("z-index", 10);

                //handle dialog actions
                self.$imageInput.replaceWith(self.$imageInput.clone()
                    .on('change', function () {
                        if (options.callbacks.onImageUploadFotorama) {
                            context.triggerEvent('image.uploadFotorama', this.files, function(jsonData) {
                                self.addImageToGallery(self.gallery, jsonData.link);
                            });
                        } else {
                            console.log('Could not find callback onImageUploadFotorama in summernote.')
                        }
                        $(this).val('');
                    })
                );
                self.$removeBtn.click(function(event) {
                    event.preventDefault();

                    deferred.resolve({
                        remove: true
                    });
                });
                self.$optionsBtn.click(function(event) {
                    event.preventDefault();

                    self.showFotoramaOptionsDialog();
                });
                self.$saveBtn.click(function(event) {
                    event.preventDefault();

                    deferred.resolve();
                });
            });

            ui.onDialogHidden(self.$dialog, function() {
                self.$removeBtn.off('click');
                self.$optionsBtn.off('click');
                self.$saveBtn.off('click');
                if (deferred.state() === 'pending') {
                    deferred.reject();
                }
            });

            ui.showDialog(self.$dialog);
        });
    };

    this.addGallery = function() {
        context.invoke('editor.saveRange');

        var gallery = new Gallery();

        self.showFotoramaDialog(gallery, true)
            .then(function() {
                context.invoke('editor.restoreRange');

                //insert new gallery
                if(gallery.images.length > 0) {
                    var $gallery = gallery.parseToJQuery();
                    context.invoke('editor.insertNode', $gallery[0]);
                }

                ui.hideDialog(self.$dialog);
            }).fail(function() {
                context.invoke('editor.restoreRange');
            });
    };

    this.editGallery = function(galleryIndex) {
        var $gallery = this.getEditorGalleries().eq(galleryIndex);
        var gallery = new Gallery($gallery);

        self.showFotoramaDialog(gallery, false)
            .then(function(data) {
                context.invoke('editor.restoreRange');

                if(typeof data != 'undefined' && data.remove == true) {
                    //remove gallery in editor
                    self.getEditorGalleries().eq(galleryIndex).remove();
                
                } else if(gallery.images.length > 0) {
                    var $newGallery = self.gallery.parseToJQuery();

                    //replace gallery in editor
                    var $editorGallery = self.getEditorGalleries().eq(galleryIndex);
                    $editorGallery.replaceWith($newGallery);
                }

                ui.hideDialog(self.$dialog);
            }).fail(function() {
                context.invoke('editor.restoreRange');
            });
    };

    this.showFotoramaOptionsDialog = function() {
        ui.onDialogShown(self.$optionsDialog, function() {
            self.$saveOptionsBtn.click(function(event) {
                event.preventDefault();

                //assign new options values
                $.each(self.gallery.inputOptions, function() {
                    var inputValue = self.getOptionInput(this).val();
                    if(inputValue) {
                        self.gallery.attr[this] = inputValue;
                    }
                });
                $.each(self.gallery.radioOptions, function() {
                    self.gallery.attr[this] = self.getCheckedOptionRadioInput(this).val();
                });

                //handle customCode field
                var customCodeArray = self.$optionsDialog.find('#option-custom-code').val().split(' ');
                $.each(customCodeArray, function() {
                    if(this.indexOf('=') > -1) {
                        var parts = this.split('=');
                        self.gallery.customCode[parts[0]] = parts[1].replace(/['"]+/g, '');
                    }
                });

                ui.hideDialog(self.$optionsDialog);
            });
        });

        ui.onDialogHidden(self.$optionsDialog, function() {
            self.$saveOptionsBtn.off('click');
        });

        ui.showDialog(self.$optionsDialog);
    };

    this.showImageCaptionDialog = function(index) {
        self.$captionInput.val(self.gallery.imageCaptions[index]);

        ui.onDialogShown(self.$captionDialog, function() {
            self.$cancelCaptionBtn.click(function(event) {
                event.preventDefault();

                ui.hideDialog(self.$captionDialog);
            });

            self.$saveCaptionBtn.click(function(event) {
                event.preventDefault();

                self.gallery.imageCaptions[index] = self.$captionInput.val();

                ui.hideDialog(self.$captionDialog);
            });
        });

        ui.onDialogHidden(self.$captionDialog, function() {
            self.$saveCaptionBtn.off('click');
        });

        ui.showDialog(self.$captionDialog)
    };

    /********************     ACTION FUNCTIONS     ********************/

    this.clearDialog = function() {
        self.$imgPreviewList.empty();
        self.unsetOptionRadioInputs();
    };

    this.addImageToGallery = function(gallery, imageUrl) {
        gallery.images.push(imageUrl);
        self.$imgPreviewList.append(self.createImagePreview(imageUrl));
    };

    $.fn.removeImage = function() {
        var $imgDiv = $(this).closest('.img-preview-div');
        var $imgIndex = self.getImgPreviewDivs().index($imgDiv);

        self.gallery.removeImageByIndex($imgIndex);
        $imgDiv.remove();
    };

    this.createImagePreview = function(imageUrl) {
        var $div = $('<div class="img-preview-div col-xs-3" style="float: left; padding: 0;">' +
            '<div class="img-preview-options" style="position: absolute; display: none; z-index: 100;">' +
            '<div class="btn-group" role="group">' +
            '<button type="button" class="btn-delete btn btn-sm btn-default" title="' + lang.tooltips.imageRemoveButton + '"><span class="glyphicon glyphicon-trash"></span></button>' +
            '<button type="button" class="btn-caption btn btn-sm btn-default" title="' + lang.tooltips.imageCaptionButton + '"><span class="glyphicon glyphicon-pencil"></span></button>' +
            '</div>' +
            '</div>' +
            '<img src="' + imageUrl + '" class="img-preview" style="width: 100%;">' +
            '</div>'
        );
        $div.find('.btn-delete').on('click', function() {
            $(this).removeImage();
        });
        $div.find('.btn-caption').on('click', function() {
            var $imgDiv = $(this).closest('.img-preview-div');
            var index = self.getImgPreviewDivs().index($imgDiv);
            self.showImageCaptionDialog(index);
        });
        $div.hover(function() {
            $(this).find('img').css('opacity', 0.8);
            $(this).find('.img-preview-options').show();
        }, function() {
            $(this).find('img').css('opacity', 1);
            $(this).find('.img-preview-options').hide();
        });

        return $div;
    };

    /********************     GETTER FUNCTIONS     ********************/

    this.getEditorGalleries = function() {
        return $editor.find('.fotorama');
    };

    this.getRawGalleries = function() {
        var $summernote = $editor.parent().find('.summernote');
        var $div = $('<div>').append($.parseHTML($summernote.val()));
        return $div.find('.fotorama');
    };

    this.getImgPreviewDivs = function() {
        return self.$imgPreviewList.find('.img-preview-div');
    };

    this.getOptionInput = function(attr) {
        return self.$optionsDialog.find('input[id=option-'+attr+']');
    };

    this.getOptionRadioInput = function(attr, value) {
        return self.$optionsDialog.find('input[name=option-'+attr+'][value=' + value + ']');
    };

    this.getCheckedOptionRadioInput = function(attr) {
        return self.$optionsDialog.find('input[name=option-'+attr+']:checked');
    };

    this.getOptionRadioInputs = function() {
        return self.$optionsDialog.find('input[type=radio]');
    };

    /********************     SETTER FUNCTIONS     ********************/

    this.setOptionInput = function(attr, value) {
        self.getOptionInput(attr).val(value);
    };

    this.setOptionRadioInput = function(attr, value) {
        self.getOptionRadioInput(attr, value).prop('checked', true).parent().addClass('active');
    };

    this.unsetOptionRadioInputs = function() {
        self.getOptionRadioInputs().prop('checked', false).parent().removeClass('active');
    };

    /********************     HTML FUNCTIONS     ********************/

    this.getFotoramaMainDialogConfig = function() {
        var imageLimitation = '';
        if (options.maximumImageFileSize) {
          var unit = Math.floor(Math.log(options.maximumImageFileSize) / Math.log(1024));
          var readableSize = (options.maximumImageFileSize / Math.pow(1024, unit)).toFixed(2) * 1 +
                             ' ' + ' KMGTP'[unit] + 'B';
          imageLimitation = '<small>' + lang.image.maximumFileSize + ' : ' + readableSize + '</small>';
        }
        var dialogConfig = {
            dialogClass: 'no-close fotoramaMainDialog',
            title: lang.dialog.title,
            body: '<div class="fotorama-dialog">' +
                      '<div class="form-group note-group-select-from-files">' +
                          '<label>' + lang.dialog.imageInput + '</label>' +
                          '<input id="image-input" class="form-control" type="file" name="files" accept="image/*" />' + imageLimitation +
                      '</div>' +
                      '<div id="image-url-list" style="width: 100%; display: flex; flex-wrap: wrap; margin-top: 20px;">' +
                      '</div>' +
                  '</div>',
            footer: '<div class="row">' +
                        '<div class="col-xs-4">' +
                            '<button href="#" id="btn-remove" class="btn btn-danger pull-left">' + lang.dialog.removeButton + '</button>' +
                        '</div>' +
                        '<div class="col-xs-4">' +
                            '<button href="#" id="btn-options" class="btn btn-info" style="margin: 0 auto; display: block;">' + lang.dialog.optionsButton + '</button>' +
                        '</div>' +
                        '<div class="col-xs-4">' +
                            '<button href="#" id="btn-save" class="btn btn-primary pull-right">' + lang.dialog.saveButton + '</button>' +
                        '</div>' +
                    '</div>'
        };
        return dialogConfig;
    };

    this.getFotoramaOptionsDialogConfig = function() {
        var optionsDialogConfig = {
            dialogClass: 'fotoramaOptionsDialog',
            title: lang.dialog.optionsTitle,
            body: '<div id="options-modal" style="margin-bottom: -20px;">' +
                      '<div class="row">' +
                          '<div class="col-xs-12 col-md-7">' +
                              '<div class="form-group">' +
                                  '<div class="input-group input-group-sm">' +
                                      '<span class="input-group-addon option-label">' + lang.options.size + '</span>' +
                                      '<input id="option-data-width" class="form-control" type="text" title="' + lang.tooltips.width + '" style="text-align: center;" />' +
                                      '<span class="input-group-addon">x</span>' +
                                      '<input id="option-data-height" class="form-control" type="text" title="' + lang.tooltips.height + '" style="text-align: center;" />' +
                                      '<span class="input-group-addon">px</span>' +
                                  '</div>' +
                              '</div>' +
                          '</div>' +
                          '<div class="col-xs-12 col-md-5">' +
                              this.createInput('data-autoplay', lang.options.autoplay, 'ms', lang.tooltips.autoplay) +
                          '</div>' +
                      '</div>' +
                      this.createRadioGroup('data-nav',
                          lang.options.nav,
                          [lang.options.navDots, lang.options.navThumbs, lang.options.navNone],
                          ['dots', 'thumbs', 'none']) +
                      this.createRadioGroup('data-navposition',
                          lang.options.navposition,
                          [lang.options.navpositionBottom, lang.options.navpositionTop],
                          ['bottom', 'top']) +
                      this.createRadioGroup('data-fit',
                          lang.options.fit,
                          [lang.options.fitContain, lang.options.fitCover, lang.options.fitScaledown, lang.options.fitNone],
                          ['contain', 'cover', 'scaledown', 'none']) +
                      this.createRadioGroup('data-transition',
                          lang.options.transition,
                          [lang.options.transitionSlide, lang.options.transitionCrossfade, lang.options.transitionDissolve],
                          ['slide', 'crossfade', 'dissolve']) +
                      this.createRadioGroup('data-allowfullscreen',
                          lang.options.allowfullscreen,
                          [lang.options.allowfullscreenTrue, lang.options.allowfullscreenFalse, lang.options.allowfullscreenNative],
                          ['true', 'false', 'native']) +
                      this.createRadioGroup('data-captions',
                          lang.options.captions,
                          [lang.options.captionsOn, lang.options.captionsOff],
                          ['true', 'false']) +
                      '<div class="form-group">' +
                          '<div class="input-group input-group-sm" title="' + lang.tooltips.customCode + '" style="width: 100%;">' +
                              '<span class="input-group-addon option-label">' + lang.options.customCode + '</span>' +
                              '<textarea id="option-custom-code" class="form-control" type="text" style="height: 4em;"/>' +
                          '</div>' +
                      '</div>' +
                  '</div>',
            footer: '<button href="#" id="btn-save-options" class="btn btn-primary pull-right">' + lang.dialog.saveOptionsButton + '</button>'
        };
        return optionsDialogConfig;
    };

    this.getFotoramaCaptionDialogConfig = function() {
        var captionDialogConfig = {
            dialogClass: 'fotoramaCaptionDialog',
            width: 300,
            body: '<div class="image-caption-dialog" style="width2: 400px;">' +
                      '<div class="form-group">' +
                          '<label>' + lang.captionDialog.title + '</label>' +
                          '<textarea id="caption-input" class="form-control" style="height: 4em;"/>' +
                      '</div>' +
                      '<div class="row">' +
                          '<div class="col-xs-6">' +
                              '<button href="#" id="btn-cancel-caption" class="btn btn-danger pull-left">' + lang.captionDialog.cancelButton + '</button>' +
                          '</div>' +
                          '<div class="col-xs-6">' +
                              '<button href="#" id="btn-save-caption" class="btn btn-primary pull-right">' + lang.captionDialog.saveButton + '</button>' +
                          '</div>' +
                      '</div>' +
                  '</div>'
        };
        return captionDialogConfig;
    };

    this.createInput = function(option, label, addon, tooltip, placeholder, style) {
        return '<div class="form-group"' + (tooltip ? ' data-toggle="tooltip" title="'+tooltip+'"' : '') + (style ? ' style="'+style+'"' : '') +'>' +
                    '<div class="input-group input-group-sm">' +
                        '<span class="input-group-addon option-label">'+label+'</span>' +
                        '<input id="option-'+option+'" class="form-control" type="text"' + (placeholder ? ' placeholder="'+placeholder+'"' : '') +' style="text-align: center; padding-left: 0; padding-right: 0;"/>' +
                        (addon ? '<span class="input-group-addon">'+addon+'</span>' : '') +
                    '</div>' +
                '</div>';
    };

    this.createRadioGroup = function(option, mainLabel, labels, values, tooltips, style) {
        var width = '' + (100 / labels.length).toFixed(2) + '%';
        var html = '<div class="form-group"' + (style ? ' style="'+style+'"' : '') + '>' +
                      '<div class="input-group input-group-sm" style="width: 100%;">' +
                          (mainLabel ? '<span class="input-group-addon option-label">' + mainLabel + '</span>' : '') +
                          '<div class="btn-group" data-toggle="buttons" style="width: 100%;">';
        for(var i = 0; i < labels.length; i++) {
            html += '<label class="btn option-radio btn-default btn-sm"' + (tooltips && tooltips[i] ? ' data-toggle="tooltip" title="'+tooltips[i]+'"' : '') +' style="width: ' + width + '">' +
                        '<input type="radio" name="option-'+option+'" value="'+values[i]+'">'+labels[i]+
                    '</label>';
        }
        html += '</div></div></div>';
        return html;
    };
  };

  /********************     GALLERY OBJECT     ********************/

  var Gallery = function(jQueryObject) {
      var self = this;

      self.images = [];
      self.imageCaptions = [];
      self.customCode = {};
      self.dataAuto = false;
      self.contentEditable = false;
      self.attr = {
          'class': 'fotorama',
          'data-width': 600,
          'data-height': 400,
          'data-nav': 'thumbs',
          'data-navposition': 'bottom',
          'data-fit': 'contain',
          'data-transition': 'slide',
          'data-autoplay': 5000,
          'data-allowfullscreen': true,
          'data-captions': false
      };
      this.inputOptions = ['data-width', 'data-height', 'data-autoplay'];
      this.radioOptions = ['data-nav', 'data-navposition', 'data-fit', 'data-transition', 'data-allowfullscreen', 'data-captions'];

      //initialize gallery
      if(jQueryObject) {
          jQueryObject.find('img').each(function(index) {
              self.images[index] = $(this).attr('src');
              self.imageCaptions[index] = $(this).attr('data-caption');
          });

          $.each(jQueryObject[0].attributes, function() {
              self.attr[this.name] = this.value;
          });
      }

      this.parseToJQuery = function() {
          var $div = $('<div>');

          $.each(self.images, function(index) {
              $div.append('<img src="' + this + '"' + (self.imageCaptions[index] ? ' data-caption="' + self.imageCaptions[index] + '"' : '') + '>');
          });

          $.each(self.attr, function(key, value) {
              $div.attr(key, value);
          });

          $.each(self.customCode, function(key, value) {
              $div.attr(key, value);
          });

          $div.attr('data-auto', self.dataAuto);
          $div.attr('contenteditable', self.contentEditable);

          return $div;
      };

      this.shiftImage = function(indexFrom, indexTo) {
          if(indexTo > indexFrom) {
              for(var i = indexFrom; i < indexTo; i++) {
                  self.shiftImageRight(i);
              }
          } else if(indexTo < indexFrom) {
              for(var i = indexFrom; i > indexTo; i--) {
                  self.shiftImageLeft(i);
              }
          }
      };

      this.shiftImageLeft = function(index) {
          if(index == 0)
              return;
          self.swapImages(index, parseInt(index)-1);
      };

      this.shiftImageRight = function(index) {
          if(index == this.images.length-1)
              return;
          self.swapImages(index, parseInt(index)+1);
      };

      this.swapImages = function(index1, index2) {
          if(index1 == index2)
              return;

          var tmp = this.images[index1];
          this.images[index1] = this.images[index2];
          this.images[index2] = tmp;

          tmp = this.imageCaptions[index1];
          this.imageCaptions[index1] = this.imageCaptions[index2];
          this.imageCaptions[index2] = tmp;
      };

      this.removeImageByIndex = function(index) {
          self.images.splice(index, 1);
          self.imageCaptions.splice(index, 1);
      }
  };

  $.extend(true, $.summernote, {
    lang: {
        'en-US': {
            fotorama: {
                tooltip: 'Fotorama gallery'
            },
            dialog: {
                title: 'Fotorama gallery configuration',
                imageInput: 'Choose image from disk',
                saveButton: 'Save',
                removeButton: 'Remove',
                optionsButton: 'Options',
                optionsTitle: 'Options configuration',
                saveOptionsButton: 'Save'
            },
            options: {
                size: 'Size',
                nav: 'Navigation',
                navDots: 'Dots',
                navThumbs: 'Thumbnails',
                navNone: 'None',
                navposition: 'Nav position',
                navpositionTop: 'Top',
                navpositionBottom: 'Bottom',
                fit: 'Fit',
                fitContain: 'Contain',
                fitCover: 'Cover',
                fitScaledown: 'Scaledown',
                fitNone: 'None',
                transition: 'Transition',
                transitionSlide: 'Slide',
                transitionCrossfade: 'Crossfade',
                transitionDissolve: 'Dissolve',
                autoplay: 'Autoplay',
                allowfullscreen: 'Fullscreen',
                allowfullscreenFalse: 'False',
                allowfullscreenTrue: 'True',
                allowfullscreenNative: 'Native',
                captions: 'Captions',
                captionsOn: 'On',
                captionsOff: 'Off',
                customCode: 'Custom attributes'
            },
            captionDialog: {
                title: 'Image caption',
                saveButton: 'Save',
                cancelButton: 'Cancel'
            },
            tooltips: {
                width: 'Width',
                height: 'Height',
                autoplay: 'Set interval duration or 0 to disable autoplay',
                customCode: 'e.g. attr1=&quot;value1&quot; attr2=&quot;value2&quot;',
                imageRemoveButton: 'Delete image',
                imageCaptionButton: 'Edit caption'
            }
        },
        'pl-PL': {
            fotorama: {
                tooltip: 'Galeria fotorama'
            },
            dialog: {
                title: 'Konfiguracja galerii Fotorama',
                imageInput: 'Wybierz grafikę z dysku',
                saveButton: 'Zapisz',
                removeButton: 'Usuń',
                optionsButton: 'Opcje',
                optionsTitle: 'Konfiguracja opcji',
                saveOptionsButton: 'Zapisz'
            },
            options: {
                size: 'Wymiary',
                nav: 'Nawigacja',
                navDots: 'Kropki',
                navThumbs: 'Miniaturki',
                navNone: 'Brak',
                navposition: 'Pozycja nawigacji',
                navpositionTop: 'Na górze',
                navpositionBottom: 'Na dole',
                fit: 'Dopasowanie',
                fitContain: 'Zawieranie',
                fitCover: 'Pokrywanie',
                fitScaledown: 'Zmniejszanie',
                fitNone: 'Brak',
                transition: 'Przejście',
                transitionSlide: 'Przesuwanie',
                transitionCrossfade: 'Przenikanie',
                transitionDissolve: 'Rozpływanie',
                autoplay: 'Autoodtwarzanie',
                allowfullscreen: 'Pełny ekran',
                allowfullscreenFalse: 'Wyłączony',
                allowfullscreenTrue: 'Włączony',
                allowfullscreenNative: 'Wbudowany',
                captions: 'Podpisy',
                captionsOn: 'Włączone',
                captionsOff: 'Wyłączone',
                customCode: 'Własne atrybuty'
            },
            captionDialog: {
                title: 'Podpis obrazka',
                saveButton: 'Zapisz',
                cancelButton: 'Anuluj'
            },
            tooltips: {
                width: 'Szerokość',
                height: 'Wysokość',
                autoplay: 'Ustaw czas trwania odstępu albo 0 aby zablokować autoodtwarzanie',
                customCode: 'np. attr1=&quot;value1&quot; attr2=&quot;value2&quot;',
                imageRemoveButton: 'Usuń obrazek',
                imageCaptionButton: 'Edytuj podpis'
            }
        }
    },
    plugins: {
        'fotorama': fotorama
    }
  });
}));

