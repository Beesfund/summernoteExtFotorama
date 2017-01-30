# summernoteExtFotorama
Plugin for Summernote allowing to use Fotorama galleries

Bootstrap 3 required for layout.

Setup:
1. Load javascript file with plugin and bootstrap files.
2. Add callback 'onImageUploadFotorama' to summernote used to upload images to your galleries. It needs to accept image file and function as parameters. First of all the image should be uploaded to server. Then on success, mentioned function should be called with JSON object having attribute 'link' with URL of uploaded image.
3. Add 'fotorama' plugin to summernote toolbar.

Code example:
```html
<script src="project_directory/js/summernote-ext-fotorama.js" type="text/javascript"></script>
<script src="project_directory/js/bootstrap.min.js" type="text/javascript"></script>
```
```javascript
$('.summernote').summernote({
      toolbar: [
          ['headline', ['style']],
          ['style', ['bold', 'italic', 'underline']],
          ['textsize', ['fontsize']],
          ['fontclr', ['color']],
          ['insert', ['link', 'picture', 'fotorama']]
      ],
			callbacks: {
				onImageUploadFotorama: function(files, onSuccess) {
					data = new FormData();
    			data.append("image", files[0]);
    			$.ajax({
    				data: data,
    				type: "POST",
    				url: '<?=$this->createUrl('controller/uploadImage')?>',
    				cache: false,
    				contentType: false,
    				processData: false,
    				success: function(json) {
    					var jsonData = JSON.parse(json);
    					onSuccess(jsonData);
    				}
    			});
				}
			}
		});
```
