import { Directive, ElementRef, EventEmitter, Host, HostListener, Input, Output } from "@angular/core";
import { NgModel } from "@angular/forms";
import { Observable } from "rxjs/Observable";
import { CtrCompleter } from "./ctr-completer";
import { isNil } from "../globals";
// keyboard events
var KEY_DW = 40;
var KEY_RT = 39;
var KEY_UP = 38;
var KEY_LF = 37;
var KEY_ES = 27;
var KEY_EN = 13;
var KEY_TAB = 9;
var CtrInput = (function () {
    function CtrInput(completer, ngModel, el) {
        var _this = this;
        this.completer = completer;
        this.ngModel = ngModel;
        this.el = el;
        this.clearSelected = false;
        this.clearUnselected = false;
        this.overrideSuggested = false;
        this.fillHighlighted = true;
        this.openOnFocus = false;
        this.tokenSeparator = '';
        this.ngModelChange = new EventEmitter();
        this._searchStr = "";
        this._displayStr = "";
        this.blurTimer = null;
        var getValueFromItem = function (item) {
            if (!item) {
                return '';
            }
            if (_this.tokenSeparator) {
                var tokens = _this.searchStr.split(_this.tokenSeparator);
                tokens[tokens.length - 1] = item.title;
                return tokens.join(_this.tokenSeparator);
            }
            else {
                return item.title;
            }
        };
        this.completer.selected.subscribe(function (item) {
            if (!item) {
                return;
            }
            if (_this.clearSelected) {
                _this.searchStr = "";
            }
            else {
                _this.searchStr = getValueFromItem(item);
            }
            _this.ngModelChange.emit(_this.searchStr);
        });
        this.completer.highlighted.subscribe(function (item) {
            if (_this.fillHighlighted) {
                if (item) {
                    _this._displayStr = getValueFromItem(item);
                }
                else {
                    _this._displayStr = _this.searchStr;
                }
                _this.ngModelChange.emit(_this._displayStr);
            }
        });
        if (this.ngModel.valueChanges) {
            this.ngModel.valueChanges.subscribe(function (value) {
                if (!isNil(value) && _this._displayStr !== value) {
                    _this.search(value);
                }
            });
        }
    }
    CtrInput.prototype.search = function (value) {
        this.searchStr = value;
        if (value && this.tokenSeparator) {
            var tokens = value.split(this.tokenSeparator);
            value = tokens[tokens.length - 1];
        }
        this.completer.search(value);
    };
    CtrInput.prototype.keyupHandler = function (event) {
        if (event.keyCode === KEY_LF || event.keyCode === KEY_RT || event.keyCode === KEY_TAB) {
            // do nothing
            return;
        }
        if (event.keyCode === KEY_UP || event.keyCode === KEY_EN) {
            event.preventDefault();
        }
        else if (event.keyCode === KEY_DW) {
            event.preventDefault();
            this.search(this.searchStr);
        }
        else if (event.keyCode === KEY_ES) {
            if (this.completer.isOpen) {
                this.restoreSearchValue();
                this.completer.clear();
                event.stopPropagation();
                event.preventDefault();
            }
        }
    };
    CtrInput.prototype.keypressHandler = function (event) {
        this.completer.open();
    };
    CtrInput.prototype.keydownHandler = function (event) {
        if (event.keyCode === KEY_EN) {
            if (this.completer.hasHighlighted()) {
                event.preventDefault();
            }
            this.handleSelection();
        }
        else if (event.keyCode === KEY_DW) {
            event.preventDefault();
            this.completer.open();
            this.completer.nextRow();
        }
        else if (event.keyCode === KEY_UP) {
            event.preventDefault();
            this.completer.prevRow();
        }
        else if (event.keyCode === KEY_TAB) {
            this.handleSelection();
        }
        else if (event.keyCode === KEY_ES) {
            // This is very specific to IE10/11 #272
            // without this, IE clears the input text
            event.preventDefault();
            if (this.completer.isOpen) {
                event.stopPropagation();
            }
        }
    };
    CtrInput.prototype.onBlur = function (event) {
        var _this = this;
        // Check if we need to cancel Blur for IE
        if (this.completer.isCancelBlur()) {
            setTimeout(function () {
                // get the focus back
                _this.el.nativeElement.focus();
            }, 0);
            return;
        }
        if (this.completer.isOpen) {
            this.blurTimer = Observable.timer(200).subscribe(function () { return _this.doBlur(); });
        }
    };
    CtrInput.prototype.onfocus = function () {
        if (this.blurTimer) {
            this.blurTimer.unsubscribe();
            this.blurTimer = null;
        }
        if (this.openOnFocus) {
            this.completer.open();
        }
    };
    Object.defineProperty(CtrInput.prototype, "searchStr", {
        get: function () {
            return this._searchStr;
        },
        set: function (term) {
            this._searchStr = term;
            this._displayStr = term;
        },
        enumerable: true,
        configurable: true
    });
    CtrInput.prototype.handleSelection = function () {
        if (this.completer.hasHighlighted()) {
            this.completer.selectCurrent();
        }
        else if (this.overrideSuggested) {
            this.completer.onSelected({ title: this.searchStr, originalObject: null });
        }
        else {
            this.completer.clear();
        }
    };
    CtrInput.prototype.restoreSearchValue = function () {
        if (this.fillHighlighted) {
            if (this._displayStr != this.searchStr) {
                this._displayStr = this.searchStr;
                this.ngModelChange.emit(this.searchStr);
            }
        }
    };
    CtrInput.prototype.doBlur = function () {
        if (this.blurTimer) {
            this.blurTimer.unsubscribe();
            this.blurTimer = null;
        }
        if (this.overrideSuggested) {
            this.completer.onSelected({ title: this.searchStr, originalObject: null });
        }
        else {
            if (this.clearUnselected && !this.completer.hasSelected) {
                this.searchStr = "";
                this.ngModelChange.emit(this.searchStr);
            }
            else {
                this.restoreSearchValue();
            }
        }
        this.completer.clear();
    };
    return CtrInput;
}());
export { CtrInput };
CtrInput.decorators = [
    { type: Directive, args: [{
                selector: "[ctrInput]",
            },] },
];
/** @nocollapse */
CtrInput.ctorParameters = function () { return [
    { type: CtrCompleter, decorators: [{ type: Host },] },
    { type: NgModel, },
    { type: ElementRef, },
]; };
CtrInput.propDecorators = {
    'clearSelected': [{ type: Input, args: ["clearSelected",] },],
    'clearUnselected': [{ type: Input, args: ["clearUnselected",] },],
    'overrideSuggested': [{ type: Input, args: ["overrideSuggested",] },],
    'fillHighlighted': [{ type: Input, args: ["fillHighlighted",] },],
    'openOnFocus': [{ type: Input, args: ["openOnFocus",] },],
    'tokenSeparator': [{ type: Input, args: ["tokenSeparator",] },],
    'ngModelChange': [{ type: Output },],
    'keyupHandler': [{ type: HostListener, args: ["keyup", ["$event"],] },],
    'keypressHandler': [{ type: HostListener, args: ["keypress", ["$event"],] },],
    'keydownHandler': [{ type: HostListener, args: ["keydown", ["$event"],] },],
    'onBlur': [{ type: HostListener, args: ["blur", ["$event"],] },],
    'onfocus': [{ type: HostListener, args: ["focus", [],] },],
};
//# sourceMappingURL=ctr-input.js.map