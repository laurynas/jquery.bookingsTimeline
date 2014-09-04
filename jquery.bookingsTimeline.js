/*
jQuery.bookingsTimeline v.0.0.1
Copyright (c) 2011 Roman Kalyakin - theorm@gmail.com
Copyright (c) 2011 Laurynas Butkus - laurynas.butkus@gmail.com
Copyright (c) 2010 JC Grubbs - jc.grubbs@devmynd.com
MIT License Applies
*/

/*
Options
-----------------
showWeekends: boolean
data: object
cellWidth: number
cellHeight: number
slideWidth: number
dataUrl: string
start: string or date
end: string or date
focus: string or date
behavior: {
	clickable: boolean,
	draggable: boolean,
	resizable: boolean,
	onClick: function,
	onDblClick: function,
	onDrag: function,
	onResize: function,
	onNewBooking: function
}
*/

(function (jQuery) {
	
    jQuery.fn.bookingsTimeline = function () {
    	
    	var args = Array.prototype.slice.call(arguments);
    	
    	if (args.length == 1 && typeof(args[0]) == "object") {
        	build.call(this, args[0]);
        	
    	}
    	
    	if (args.length == 2 && typeof(args[0]) == "string") {
    		handleMethod.call(this, args[0], args[1]);
    	}
    };
    
    function build(options) {
    	
    	var els = this;
        var defaults = {
            showWeekends: true,
            cellWidth: 21,
            cellHeight: 31,
            slideWidth: 400,
            vHeaderWidth: 100,
            behavior: {
            	clickable: true,
            	draggable: true,
            	resizable: true,
            	cross_highlight: true
            },
			monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
			start: null,
			end: null,
			focus: null
        };
        
        var opts = jQuery.extend(true, defaults, options);

		if (opts.data) {
			buildAndSave(this, opts);
		} else if (opts.dataUrl) {
			var div = this;
			jQuery.getJSON(opts.dataUrl, function (data) { 
				opts.data = data; 
				buildAndSave(div, opts);
			});
		}
		
		function buildAndSave(div, opts) {
			build();
			// save settings without data for future use.
			var settings = jQuery.extend(true,{},opts);
			delete settings['data'];
			div.data("options",settings);
		}
		

		function build() {
			
			var minDays = Math.floor((opts.slideWidth / opts.cellWidth) + 5);
			var startEnd = DateUtils.getBoundaryDatesFromData(opts.data, minDays);
			var startDate = Date.parse(opts.start);
			var endDate = Date.parse(opts.end);

			opts.start = (startDate && startDate < startEnd[0]) ? startDate : startEnd[0];
			opts.end = (endDate > startEnd[1]) ? endDate : startEnd[1];
			
	        els.each(function () {

	            var container = jQuery(this);
	            var div = jQuery("<div>", { "class": "bookingstimeline" });
	            var chart = new Chart(div, opts)
	            chart.render();
	            container.data("chart", chart);
				container.append(div);
				
				var w = jQuery("div.bookingstimeline-vtheader", container).outerWidth() +
					jQuery("div.bookingstimeline-slide-container", container).outerWidth();
	            container.css("width", (w + 2) + "px");
	            
				focusDate(opts.focus);

	            new Behavior(container, opts).apply();

                if (opts.onLoad)
                    opts.onLoad(container);
	        });
		}

		function focusDate(date) {
			date = Date.parse(date);
		
			var offset = DateUtils.daysBetween(opts.start, date) * opts.cellWidth;

			jQuery("div.bookingstimeline-slide-container").scrollLeft(offset);
		}
    }
    
	function handleMethod(method, value) {
		
		if (method == "setSlideWidth") {
			var div = $("div.bookingstimeline", this);
			div.each(function () {
				var vtWidth = $("div.bookingstimeline-vtheader", div).outerWidth();
				$(div).width(vtWidth + value + 1);
				$("div.bookingstimeline-slide-container", this).width(value);
			});
		}
		
		if (method == "addBookings") {
			jQuery(this).data("chart").addBookings(jQuery(this), value);
		}
		if (method == "removeBookings") {
			jQuery(this).data("chart").removeBookings(jQuery(this), value);
		}
	}

	var Chart = function(div, opts) {

		function render() {
			addVtHeader(div, opts.data, opts.cellHeight);

            var slideDiv = jQuery("<div>", {
                "class": "bookingstimeline-slide-container",
                "css": { "width": opts.slideWidth + "px" }
            });
			
            dates = getDates(opts.start, opts.end);
            addHzHeader(slideDiv, dates, opts.cellWidth);
            addGrid(slideDiv, opts.data, dates, opts.cellWidth, opts.showWeekends);
            addBlockContainers(slideDiv, opts.data, opts);
            addBlocks(slideDiv, opts.data, opts.cellWidth, opts.start);
            setupBlockContainersEvents(slideDiv,opts);
            div.append(slideDiv);
            applyLastClass(div.parent());
			focus(opts.focus);
		}
		
		// Creates a 3 dimensional array [year][month][day] of every day 
		// between the given start and end dates
        function getDates(start, end) {
            var dates = [];
			dates[start.getFullYear()] = [];
			dates[start.getFullYear()][start.getMonth()] = [start]
			var last = start;
			while (last.compareTo(end) == -1) {
				var next = last.clone().addDays(1);
				if (!dates[next.getFullYear()]) { dates[next.getFullYear()] = []; }
				if (!dates[next.getFullYear()][next.getMonth()]) { 
					dates[next.getFullYear()][next.getMonth()] = []; 
				}
				dates[next.getFullYear()][next.getMonth()].push(next);
				last = next;
			}
			return dates;
        }

        function addVtHeader(div, data, cellHeight) {
            var headerDiv = jQuery("<div>", { "class": "bookingstimeline-vtheader" });
            for (var i = 0; i < data.length; i++) {
                var itemDiv = jQuery("<div>", { "class": "bookingstimeline-vtheader-item" });
                itemDiv.append(jQuery("<div>", {
                    "class": "bookingstimeline-vtheader-item-name",
                    "css": { "height": cellHeight + "px" }
                }).append(data[i].name));
                headerDiv.append(itemDiv);
            }
            div.append(headerDiv);
        }

        function addHzHeader(div, dates, cellWidth) {
            var headerDiv = jQuery("<div>", { "class": "bookingstimeline-hzheader" });
            var monthsDiv = jQuery("<div>", { "class": "bookingstimeline-hzheader-months" });
            var daysDiv = jQuery("<div>", { "class": "bookingstimeline-hzheader-days" });
            var totalW = 0;
			for (var y in dates) {
				for (var m in dates[y]) {
					var w = dates[y][m].length * cellWidth;
					totalW = totalW + w;
					monthsDiv.append(jQuery("<div>", {
						"class": "bookingstimeline-hzheader-month",
						"css": { "width": (w - 1) + "px" }
					}).append(opts.monthNames[m] + "/" + y));
					for (var d in dates[y][m]) {
						daysDiv.append(jQuery("<div>", { "class": "bookingstimeline-hzheader-day" })
							.append(dates[y][m][d].getDate()));
					}
				}
			}
            monthsDiv.css("width", totalW + "px");
            daysDiv.css("width", totalW + "px");
            headerDiv.append(monthsDiv).append(daysDiv);
            div.append(headerDiv);
        }

        function addGrid(div, data, dates, cellWidth, showWeekends) {
            var gridDiv = jQuery("<div>", { "class": "bookingstimeline-grid" });
            var rowDiv = jQuery("<div>", { "class": "bookingstimeline-grid-row" });
			for (var y in dates) {
				for (var m in dates[y]) {
					for (var d in dates[y][m]) {
						var cellDiv = jQuery("<div>", { "class": "bookingstimeline-grid-row-cell" });
						if (DateUtils.isWeekend(dates[y][m][d]) && showWeekends) { 
							cellDiv.addClass("bookingstimeline-weekend"); 
						}
						cellDiv.append(jQuery("<div>", {"class": "bookingstimeline-grid-row-cell-midday"}));
						rowDiv.append(cellDiv);
					}
				}
			}
            var w = jQuery("div.bookingstimeline-grid-row-cell", rowDiv).length * cellWidth;
            rowDiv.css("width", w + "px");
            gridDiv.css("width", w + "px");
            for (var i = 0; i < data.length; i++) {
                gridDiv.append(rowDiv.clone());
            }
            div.append(gridDiv);
        }

        function addBlockContainers(div, data, opts) {
            var blocksDiv = jQuery("<div>", { "class": "bookingstimeline-blocks" });
            for (var i = 0; i < data.length; i++) {
                blocksDiv.append(jQuery("<div>", { "class": "bookingstimeline-block-container" }));
            }
            div.append(blocksDiv);
        }
        
        function selection(mousemoveEvent) {
        	var endIndex = $(this).index();
        	var startIndex = jQuery(this).closest("div.bookingstimeline").data("selection").start;
        	var direction = "right"; 
        	if (endIndex < startIndex) {
        		direction = "left";
        		var tmp = startIndex;
        		startIndex = endIndex;
        		endIndex = tmp;
        	}
        	var cells = jQuery("div.bookingstimeline-grid-row-cell", $(this).closest("div.bookingstimeline-grid-row"));
        	cells.removeClass("selected");
        	cells.each(function(idx,cell) {
        		if (idx >= startIndex && idx <= endIndex) {
        			$(cell).addClass("selected");
        		}
        	});
			//console.log("moving " + direction + " " + startIndex + " - " + endIndex); 								
        }
        
        function setupBlockContainersEvents(div, opts) {
        	jQuery("div.bookingstimeline-grid-row-cell", div).each(function(idx,cell) {
        		jQuery(cell).mousedown(function() {
        			var facilityIndex = jQuery(this).closest("div.bookingstimeline-grid-row").index();
        			var facilityData = jQuery(jQuery("div.bookingstimeline-block-container",div).get(facilityIndex)).data("block-data");
        			//console.log("selected on: " + facilityData.name + " " + facilityIndex);
        			// save selection data
        			jQuery(this).closest("div.bookingstimeline").data("selection",{start: $(this).index(), facility: facilityData});
	        		// hook up moving event
	        		jQuery("div.bookingstimeline-grid-row-cell",jQuery(this).closest("div.bookingstimeline-grid-row")).mousemove(selection);
	        		$(this).addClass("selected");
	        		return false;
        		});
        		jQuery(cell).mouseup(function() {
        			if (jQuery(this).closest("div.bookingstimeline").data("selection")) {
        				var cells = jQuery("div.bookingstimeline-grid-row-cell",jQuery(this).closest("div.bookingstimeline-grid-row"))
		        		cells.unbind("mousemove");
		        		cells.removeClass("selected");
		        		var timeline = jQuery(this).closest("div.bookingstimeline");
	        			var selection = timeline.data("selection");
	        			timeline.data("selection",null);
	        			//console.log("moved: " + $(this));
	        			
	        			var opts = jQuery(this).closest("div.bookingstimeline").parent().data("options");
			        	
			        	if (opts.behavior.onNewBooking) {
				        	var endIndex = $(this).index();
				        	var startIndex = selection.start;
				        	if (endIndex < startIndex) {
				        		var tmp = startIndex;
				        		startIndex = endIndex;
				        		endIndex = tmp;
				        	}
							var startDate = new Date(opts.start);
							startDate.setDate(startDate.getDate()+startIndex);
							var endDate = new Date(startDate);
							endDate.setDate(startDate.getDate()+(endIndex-startIndex));
							//console.log("New booking for " + selection.facility.name + " from " + startDate + " to " + endDate);
							opts.behavior.onNewBooking(startDate, endDate, selection.facility);
			        	}
        			}
        		});

        	});
        }

        function addBlocks(div, data, cellWidth, start, animate) {
            var rows = jQuery("div.bookingstimeline-blocks div.bookingstimeline-block-container", div);
            var rowIdx = 0;
            for (var i = 0; i < data.length; i++) {
                for (var j = 0; j < data[i].series.length; j++) {
                    var series = data[i].series[j];
                    var size = DateUtils.daysBetween(series.start, series.end);
					var offset = DateUtils.daysBetween(start, series.start);
                    var block = jQuery("<div>", {
                        "class": "bookingstimeline-block",
                        "title": series.title ? series.title : series.name + ", " + size + " nights",
                        "css": {
                            "width": ((size * cellWidth) - 2) + "px",
                            "left": ((offset * cellWidth) + Math.floor(cellWidth/2)) + "px"
                        }
                    });
                    series.start = Date.parse(series.start);
                    series.end = Date.parse(series.end);
                    
                    block.data("block-data", series); // booking data
                    if (data[i].series[j].color) {
                        block.css("background-color", data[i].series[j].color);
                    }
					if (data[i].series[j].cssClass) {
                        block.addClass(data[i].series[j].cssClass);
                    }
                    block.append(jQuery("<div>", { "class": "bookingstimeline-block-text" }).text(size));
                    if (animate) {
                    	block.hide().appendTo(jQuery(rows[rowIdx])).fadeIn();
                    } else {
	                    jQuery(rows[rowIdx]).append(block);                    	
                    }
                    
                }
                var facilityData = jQuery.extend({},data[i]);
                delete facilityData['series'];
                jQuery(rows[rowIdx]).data("block-data", facilityData);
                rowIdx = rowIdx + 1;
            }
        }
        
        function applyLastClass(div) {
            jQuery("div.bookingstimeline-grid-row div.bookingstimeline-grid-row-cell:last-child", div).addClass("last");
            jQuery("div.bookingstimeline-hzheader-days div.bookingstimeline-hzheader-day:last-child", div).addClass("last");
            jQuery("div.bookingstimeline-hzheader-months div.bookingstimeline-hzheader-month:last-child", div).addClass("last");
        }
        
        function addBookings(div, bookings) {
        	var options = div.data("options");
        	addBlocks(div,bookings,options.cellWidth,options.start,true);
			new Behavior(div, options).apply();
        }
        
        function removeBookings(div, toRemove) {
        	var options = div.data("options");
			var bookings = jQuery("div.bookingstimeline-block", div);
			bookings.each(function(idx, booking) {
				booking = jQuery(booking);
				var bookingId = booking.data("block-data").id;
				if (jQuery.inArray(bookingId, toRemove) >= 0) {
					booking.fadeOut("slow", function() {jQuery(this).remove();});
				}
			});
        }
		
		return {
			render: render,
			addBookings: addBookings,
			removeBookings: removeBookings,
		};
	}

	var Behavior = function (div, opts) {
		
		function apply() {
            bindBlockEvent(div, "mouseover", opts.behavior.onMouseOver);
            bindBlockEvent(div, "mouseout", opts.behavior.onMouseOut);
            
            if (opts.behavior.cross_highlight) {
            	bindCrossHighlight(div);
            }

			if (opts.behavior.clickable) { 
            	bindBlockEvent(div, "click", opts.behavior.onClick);
            	bindBlockEvent(div, "dblclick", opts.behavior.onDblClick);
        	}
        	
            if (opts.behavior.resizable) { 
            	bindBlockResize(div, opts.cellWidth, opts.start, opts.end, opts.behavior.onResize); 
        	}
            
            if (opts.behavior.draggable) { 
            	bindBlockDrag(div, opts.cellWidth, opts.cellHeight, opts.start, opts.end, opts.behavior.onDrag, opts.behavior.draggable_axis); 
        	}
		}
		
		function getDayAndFacilityForCell(div, cell) {
				cell = jQuery(cell);
            	var x = cell.index();
            	var y = cell.parent().index();
            	var day = jQuery("div.bookingstimeline-hzheader-day", div).get(x);
            	var facility = jQuery("div.bookingstimeline-vtheader-item", div).get(y);
            	return {
            		'day' : jQuery(day),
            		'facility' : jQuery(facility)
            	}
		}
		
		function bindCrossHighlight(div) {
            jQuery("div.bookingstimeline-grid-row-cell", div).live("mouseover", function () {
            	var df = getDayAndFacilityForCell(div,this);
				df.day.addClass("highlight");
				df.facility.addClass("highlight");
            });
            jQuery("div.bookingstimeline-grid-row-cell", div).live("mouseout", function () {
	        	var df = getDayAndFacilityForCell(div,this);
				df.day.removeClass("highlight");
				df.facility.removeClass("highlight");
            });
		}

        function bindBlockEvent(div, eventName, callback) {
            jQuery("div.bookingstimeline-block", div).live(eventName, function () {
                if (callback) { callback(jQuery(this).data("block-data"), this); }
            });
        }
        
        function bindBlockResize(div, cellWidth, startDate, endDate, callback) {
        	jQuery("div.bookingstimeline-block", div).resizable({
        		grid: cellWidth, 
        		handles: "e,w",
        		stop: function (event, ui) {
        			var block = jQuery(this);
					var updatedPosition = getUpdatedPosition(div, block, cellWidth, startDate, endDate, ui.position);
					var facility = block.parent().data("block-data");
        			if (callback) { 
						var oldBookingData = block.data("block-data");
						var newBookingData = jQuery.extend({},oldBookingData);
        				newBookingData = jQuery.extend(newBookingData, {start: updatedPosition.start, end: updatedPosition.end});
        				if (!callback(oldBookingData, newBookingData, facility, this)) {
        					updatedPosition.start = oldBookingData.start;
        				    updatedPosition.end = oldBookingData.end;
	                        var size = DateUtils.daysBetween(updatedPosition.start, updatedPosition.end);
							var offset = DateUtils.daysBetween(startDate, updatedPosition.start);
							block.animate({width: ((size * cellWidth) - 2) + "px", "left" : ((offset * cellWidth) + Math.floor(cellWidth/2)) + "px"});
        				}
        			}
					updateDataAndPosition(block, updatedPosition);
					var data = block.data("block-data");
					var nights = (updatedPosition.end-updatedPosition.start)/(1000*60*60*24)
					block.attr("title", data.title ? data.title : data.name + ", " + nights + " nights");
					block.find("div.bookingstimeline-block-text").text(nights);
        		}
        	});
        }
        
        function bindBlockDrag(div, cellWidth, cellHeight, startDate, endDate, callback, draggable_axis) {
        	jQuery("div.bookingstimeline-block", div).draggable({
        		grid: [cellWidth, cellHeight+1],
        		axis: draggable_axis,
        		containment: jQuery("div.bookingstimeline-grid"),
				start: function(event, ui) {
					jQuery(this).zIndex(jQuery(this).zIndex()+1);
					jQuery(this).data("old-position", jQuery(this).position().left);
				},
        		stop: function (event, ui) {
        			var block = jQuery(this);
        			var updatedPosition = getUpdatedPosition(div, block, cellWidth, startDate, endDate, ui.offset);
        			if (callback) {
        				var oldBookingData = block.data("block-data");
        				var oldFacilityData = block.parent().data("block-data");
        				var newBookingData = jQuery.extend({},oldBookingData);
        				newBookingData = jQuery.extend(newBookingData, {start: updatedPosition.start, end: updatedPosition.end});
        				var newFacilityData = updatedPosition.facility.data("block-data");
        				if (!callback(oldBookingData, newBookingData, oldFacilityData, newFacilityData, this)) {
        					// if callback returns false put the block back into original position
							block.animate({top: "5px", "left" : block.data("old-position") + "px"},function() {
								block.css("top", ""); // when animation is over unset the 'top' property to centre the element in the cell.
							});
							jQuery(this).zIndex(jQuery(this).zIndex()-1);
        					return;
        				}
        			}
        			updateDataAndPosition(block, updatedPosition);
    				jQuery(this).zIndex(jQuery(this).zIndex()-1);
        		}
        	});
        	
        }
        
        /**
         * Returns the following array
         * - start - new start date
         * - end - new end date
         * - offset - new offset in pixels (x)
         * - facility - new facility container (y)
         */
        function getUpdatedPosition(div, block, cellWidth, startDate, endDate, newOffset) {
        	var container = jQuery("div.bookingstimeline-slide-container", div);
        	var scroll = container.scrollLeft();
			var offset = block.offset().left - container.offset().left - 1 + scroll;

			// Get new start date
			var daysFromStart = Math.round(offset / cellWidth);
			var newStart = startDate.clone().addDays(daysFromStart);
        	
        	// Get new end date
			var width = block.outerWidth();
			var numberOfDays = Math.round(width / cellWidth);
			var newEnd = newStart.clone().addDays(numberOfDays);
			
			// update if the facility changed (dragged to another container over the y axis)
			var facilityElement = block.parent();
			if (newOffset != null) {
				var facilities = jQuery("div.bookingstimeline-block-container");
				var blockTopOffset = newOffset.top;
				facilities.each(function(idx, facility) {
					var facilityTopOffset = jQuery(facility).offset().top;
					var facilityHeight = jQuery(facility).outerHeight();
					if (facilityTopOffset <= blockTopOffset && (facilityTopOffset + facilityHeight) > blockTopOffset) {
						facilityElement = jQuery(facility);
						return false;
					}
				});
			}
			
			return {
				start: newStart,
				end: newEnd,
				offset: offset,
				facility: facilityElement,
			};

        }
        
        function updateDataAndPosition(block, updatedPosition) {
        	// handle x axis
			block.data("block-data").start = updatedPosition.start;
			block.data("block-data").end = updatedPosition.end;
			// this line below is not needed. we jquery with  proper positioning 
			//block.css("top", "").css("left", updatedPosition.offset + "px");

			// handle y axis
			if (updatedPosition.facility != block.parent()) {
				block.detach();
				updatedPosition.facility.append(block);
				block.css("top", "");
			}
        }
        
        return {
        	apply: apply	
        };
	}

    var ArrayUtils = {
	
        contains: function (arr, obj) {
            var has = false;
            for (var i = 0; i < arr.length; i++) { if (arr[i] == obj) { has = true; } }
            return has;
        }
    };

    var DateUtils = {
    	
        daysBetween: function (start, end) {
            if (!start || !end) { return 0; }
            if (typeof(start) == 'string') {start = Date.parse(start);}            	 
            if (typeof(end) == 'string') {end = Date.parse(end);}

            if (start.getYear() == 1901 || end.getYear() == 8099) { return 0; }
            var count = 0, date = start.clone();
            while (date.compareTo(end) == -1) { count = count + 1; date.addDays(1); }
            return count;
        },
        
        isWeekend: function (date) {
            return date.getDay() % 6 == 0;
        },

		getBoundaryDatesFromData: function (data, minDays) {
			var minStart = new Date(); maxEnd = new Date();
			for (var i = 0; i < data.length; i++) {
				for (var j = 0; j < data[i].series.length; j++) {
					var start = Date.parse(data[i].series[j].start);
					var end = Date.parse(data[i].series[j].end)
					if (i == 0 && j == 0) { minStart = start; maxEnd = end; }
					if (minStart.compareTo(start) == 1) { minStart = start; }
					if (maxEnd.compareTo(end) == -1) { maxEnd = end; }
				}
			}
			
			// Insure that the width of the chart is at least the slide width to avoid empty
			// whitespace to the right of the grid
			if (DateUtils.daysBetween(minStart, maxEnd) < minDays) {
				maxEnd = minStart.clone().addDays(minDays);
			}
			
			return [minStart, maxEnd];
		}
    };

})(jQuery);
