// Call when the document is ready
var elementId = -1;

$( document ).ready(function() {
	loadDataElements();
});

var sendSelectedElement = function () {
	var labels = Array();

	//Get the list of labelIds for the element
	$(':checked').each(function (item) {
		labels.push($(this).attr('labelId'));
	});

	//send each label for a given element
	for (var i = 0; i < labels.length; i++){
		labelResult = {
			element: elementId,
			selected: labels[i]
		}

		$.post("/item", labelResult, function (data) {
			console.log("Successfully sent selection...");
		});
	}

	$(':checked').each(function (item) {
		$(this).prop('checked', false);
	});

	loadDataElements();
}

var regenDisplayableButtons = function() {
	console.log("Called regen...");

	// turn off the keypress function
	$(document).off("keypress");
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
		} else {
			console.log("Acquired element...");

			$("#element-content-panel").html(dataElement.elementText);

			// Set up the buttons...
			regenDisplayableButtons();

			$("#loadingDialog").modal('hide');
			console.log("Loaded element...");

			elementId = dataElement.elementId;

			$('input:button').click(function () {
				sendSelectedElement();
			});
		}
	})
}