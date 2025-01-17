/**
 * Since every GUI page can display the FPS or realtime counter,
 * this manager is initialized for every GUI page.
 */
var g_OverlayCounterManager;

class OverlayCounterManager
{
	constructor(dataCounter)
	{
		this.dataCounter = dataCounter;
		this.counters = [];
		this.enabledCounters = [];
		this.lastTick = undefined;
		this.resizeHandlers = [];
		this.lastHeight = undefined;
		this.initSize = this.dataCounter.size;

		for (let name of this.availableCounterNames())
		{
			let counterType = OverlayCounterTypes.prototype[name];
			if (counterType.IsAvailable && !counterType.IsAvailable())
				continue;

			let counter = new counterType(this);
			this.counters.push(counter);
			counter.updateEnabled();
		}

		this.dataCounter.onTick = this.onTick.bind(this);
	}

	/**
	 * Mods may overwrite this to change the order of the counters shown.
	 */
	availableCounterNames()
	{
		return Object.keys(OverlayCounterTypes.prototype);
	}

	deleteCounter(counter)
	{
		let filter = count => count != counter;
		this.counters = this.counters.filter(filter);
		this.enabledCounters = this.enabledCounters.filter(filter);
	}

	/**
	 * This function allows enabling and disabling of timers while preserving the counter order.
	 */
	setCounterEnabled(counter, enabled)
	{
		if (enabled)
			this.enabledCounters = this.counters.filter(count =>
				this.enabledCounters.indexOf(count) != -1 || count == counter);
		else
			this.enabledCounters = this.enabledCounters.filter(count => count != counter);

		// Update instantly
		this.lastTick = undefined;
		this.onTick();
	}

	/**
	 * Handlers subscribed here will be informed when the dimension of the overlay changed.
	 * This allows placing the buttons away from the counter.
	 */
	registerResizeHandler(handler)
	{
		this.resizeHandlers.push(handler);
	}

	onTick()
	{
		// Don't rebuild the caption every frame
		let now = Date.now();
		if (now < this.lastTick + this.Delay)
			return;

		this.lastTick = now;

		let lineCount = 0;
		let txt = "";

		for (let counter of this.enabledCounters)
		{
			let newTxt = counter.get();
			if (!newTxt)
				continue;

			++lineCount;
			txt += setStringTags(newTxt,this.FontSizeTags) + "\n";
		}

		let height;
		if (lineCount)
		{
			this.dataCounter.caption = txt;
			// Just using the previous size for getting the size of the new text
			// could lead to unneeded linebreaks.
			// Therefore we set the overlay to the maximum size before reading the text size.
			this.dataCounter.size = this.initSize;
			let textSize = this.dataCounter.getTextSize();
			let size = this.dataCounter.size;
			// Added for the boonGUI mod, see explanation in v1.6.3 Logbuch.
			size.bottom = size.top + (lineCount == 1 ?  textSize.height : textSize.height - (lineCount) );
			size.left = size.right - textSize.width-30;
			this.dataCounter.size = size;
			height = textSize.height;
		}
		else
			height = 0;

		this.dataCounter.hidden = !lineCount;

		if (this.lastHeight != height)
		{
			this.lastHeight = height;
			for (let handler of this.resizeHandlers)
				handler(height);
		}
	}
}

/**
 * To minimize the computation performed every frame, this duration
 * in milliseconds determines how often the caption is rebuilt.
 */
OverlayCounterManager.prototype.Delay = 250;
OverlayCounterManager.prototype.FontSizeTags = {
	"font": "mono-stroke-14"
};