// Call when the document is ready
$( document ).ready(function() {
	loadDataElements();
});

var sendSelectedElement = function(elementId, selectedLabelId) {
	result = {
		element: elementId,
		selected: selectedLabelId,
	}

	$.post("/item", result, function(data) {
		console.log("Successfully sent selection...");
		loadDataElements();
	})
}



var regenDisplayableButtons = function() {
	console.log("Called regen...");

	// turn off the keypress function
	$(document).off("keypress");

	$('.hidden-label').each(function() {
		$(this).off("click");
		$(this).hide();
	});

	$('.selected-label').each(function() {
		var labelIndex = $(this).attr('labelindex');

		$(this).show();

		// Set the click function for this label ID
		$(this).off("click").click(function() {
			handleButtonClick($(this));
		});

		// Set the keypress for this label
		var thisButton = $(this);
		$(document).keypress(function(e) {
			if ( e.which-48 == labelIndex ) {
				handleButtonClick(thisButton);
			}
		});		

	});
}

var loadDataElements = function() {

	console.log("loadDataElements() called.");
	$("#loadingDialog").modal('show');

	$.get("/item", function(json) {
		dataElement = json;

		if ( "empty" in dataElement ) {
			$("#loadingDialog").modal('hide');

			alert("You have no more elements in this task!");
			console.log("You have no more elements in this task!");

			// turn off the keypress function
			$(document).off("keypress");

			$('.hidden-label').each(function() {
				$(this).off("click");
				$(this).hide();
			});

			$('.selected-label').each(function() {
				$(this).off("click");
				$(this).hide();	
			});

		} else {
			console.log("Acquired element...");

			$("#element-content-panel").html(dataElement.elementText);

			// Set up the buttons...
			regenDisplayableButtons();

			$("#loadingDialog").modal('hide');
			console.log("Loaded element...");
		}
	})

}