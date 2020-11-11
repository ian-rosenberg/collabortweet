// Call when the document is ready
$( document ).ready(function() {
    loadDataElements();
});

var result = {};

var updateSelectedElement = function(elementLabelId, labelId) {
    result = {
        elementLabelId: elementLabelId,
        newLabelId: labelId,
    }

}

var updateMultiLabelElement = function(elementId, labelId, toRemove){
	result = {
        elementId: elementId,
        newLabelId: labelId,
        toDelete: toRemove
    }

	console.log(result);

    $.post("/updateMulti-Label", result, function(data) {
        console.log("Successfully sent update...");
    })
}

var updateSelectedRangeElement = function(oldDecisionId, newScaleId){
	result = {
        previousDecisionId: oldDecisionId,
        newScaleId: newScaleId,
    }

    $.post("/updateRange", result, function(data) {
        console.log("Successfully sent update...");
    })
}

var handleNavClick = function(pageSize, pageCursor) {

    var rowCount = $('.reviewable-row').length;

    $('.reviewable-row').each(function() {
        var thisRowId = $(this).attr("rowindex");

        if ( thisRowId >= ((pageCursor - 1) * pageSize) && thisRowId < (pageCursor * pageSize) ) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });

    if ( pageCursor <= 1 ) {
        $('#pre-button').addClass("disabled");
    } else {
        $('#pre-button').removeClass("disabled");
        $('#pre-button').off("click").click(function() {
           handleNavClick(pageSize, pageCursor - 1);
        });
    }

    if ( pageCursor * pageSize >= rowCount ) {
        $('#next-button').addClass("disabled");
    } else {
        $('#next-button').removeClass("disabled");
        $('#next-button').off("click").click(function() {
           handleNavClick(pageSize, pageCursor + 1);
        });
    }
}

var loadDataElements = function() {

    var pageSize = 10;
    var pageCursor = 1;
    var labelIds = Array();

    handleNavClick(pageSize, pageCursor);    

    $('#next-button').off("click").click(function() {
       handleNavClick(pageSize, pageCursor + 1);
    });

    $('.update-label').each(function() {
        // The element-label ID pair is part of the form...
        var elementLabelId = $(this).attr('elementlabelid');

        // We need the button in this form.
        var form = $(this);
        var button = $(this).children("input");

        // Set the click function for this form's button to
        //. update the element-label pair with the selected option
        button.off("click").click(function() {

			var selectedLabelId = form.children("select").children("option:selected").val();
			updateMultiLabelElement(elementLabelId, selectedLabelId);
		});
    });

    // Set the click function for this form's button
    // to change elementLabels for the multi-label task
    // Need to send the lId (label ids) for updating/creating
    // new elId (element labels) in the database
    $("input:checkbox").change(function(){
            
        var form = $(this).closest('[id^=update-multi-label]');

        // Set an identifier to tell if
        // we have un-checked a label
        if(this.hasAttribute('checked')){
            labelIds.push([$(this).val(), 0, form.attr('id').split(' ')[1]]);
        }
        else{
            labelIds.push([$(this).val(), 1, form.attr('id').split(' ')[1]]);
        }

        // We need the button in this form.
        var button = form.children("input:button");
     
        // Set the click function for this form's button to
        //. update the element-label pair with the selected option
        button.off("click").click(function() {
            labelIds.forEach(function (labelIdChecked) {
                updateMultiLabelElement(labelIdChecked[2], labelIdChecked[0], labelIdChecked[1]);
            });

            labelIds = Array();
			
			location.reload(true);
        });
    });

	

    // Set the click function for this form's button to
	// update the elementrange decision with the selected option
	// Need to send the rsId (decision id) and radioAnswer (new scale value)
	$('input:radio').change(function () {
		var oldDecisionId = $(this).parent().parent('form').attr('elementlabelid');
		var newRadioAnswer = $(this).val();
		var thisButton = $(this).parent().parent('form').children('input:button');
		
		thisButton.off("click").click(function() {
			updateSelectedRangeElement(oldDecisionId, newRadioAnswer);
		});
	});  
}