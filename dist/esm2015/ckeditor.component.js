/**
 * @license Copyright (c) 2003-2021, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */
import { __awaiter } from "tslib";
import { Component, Input, Output, NgZone, EventEmitter, forwardRef, ElementRef } from '@angular/core';
import EditorWatchdog from '@ckeditor/ckeditor5-watchdog/src/editorwatchdog';
import { first } from 'rxjs/operators';
import uid from './uid';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
export class CKEditorComponent {
    constructor(elementRef, ngZone) {
        /**
         * The configuration of the editor.
         * See https://ckeditor.com/docs/ckeditor5/latest/api/module_core_editor_editorconfig-EditorConfig.html
         * to learn more.
         */
        this.config = {};
        /**
         * The initial data of the editor. Useful when not using the ngModel.
         * See https://angular.io/api/forms/NgModel to learn more.
         */
        this.data = '';
        /**
         * Tag name of the editor component.
         *
         * The default tag is 'div'.
         */
        this.tagName = 'div';
        /**
         * Fires when the editor is ready. It corresponds with the `editor#ready`
         * https://ckeditor.com/docs/ckeditor5/latest/api/module_core_editor_editor-Editor.html#event-ready
         * event.
         */
        this.ready = new EventEmitter();
        /**
         * Fires when the content of the editor has changed. It corresponds with the `editor.model.document#change`
         * https://ckeditor.com/docs/ckeditor5/latest/api/module_engine_model_document-Document.html#event-change
         * event.
         */
        this.change = new EventEmitter();
        /**
         * Fires when the editing view of the editor is blurred. It corresponds with the `editor.editing.view.document#blur`
         * https://ckeditor.com/docs/ckeditor5/latest/api/module_engine_view_document-Document.html#event-event:blur
         * event.
         */
        this.blur = new EventEmitter();
        /**
         * Fires when the editing view of the editor is focused. It corresponds with the `editor.editing.view.document#focus`
         * https://ckeditor.com/docs/ckeditor5/latest/api/module_engine_view_document-Document.html#event-event:focus
         * event.
         */
        this.focus = new EventEmitter();
        /**
         * Fires when the editor component crashes.
         */
        this.error = new EventEmitter();
        /**
         * If the component is read–only before the editor instance is created, it remembers that state,
         * so the editor can become read–only once it is ready.
         */
        this.initiallyDisabled = false;
        /**
         * A lock flag preventing from calling the `cvaOnChange()` during setting editor data.
         */
        this.isEditorSettingData = false;
        this.id = uid();
        this.ngZone = ngZone;
        this.elementRef = elementRef;
    }
    /**
     * When set `true`, the editor becomes read-only.
     * See https://ckeditor.com/docs/ckeditor5/latest/api/module_core_editor_editor-Editor.html#member-isReadOnly
     * to learn more.
     */
    set disabled(isDisabled) {
        this.setDisabledState(isDisabled);
    }
    get disabled() {
        if (this.editorInstance) {
            return this.editorInstance.isReadOnly;
        }
        return this.initiallyDisabled;
    }
    /**
     * The instance of the editor created by this component.
     */
    get editorInstance() {
        let editorWatchdog = this.editorWatchdog;
        if (this.watchdog) {
            // Temporarily use the `_watchdogs` internal map as the `getItem()` method throws
            // an error when the item is not registered yet.
            // See https://github.com/ckeditor/ckeditor5-angular/issues/177.
            editorWatchdog = this.watchdog._watchdogs.get(this.id);
        }
        if (editorWatchdog) {
            return editorWatchdog.editor;
        }
        return null;
    }
    /**
     *Implementing the OnChanges interface.
     *Whenever 'data' property changes we need to update the contents of the editor.
    */
    ngOnChanges(changes) {
        if (Object.prototype.hasOwnProperty.call(changes, 'data') && changes.data && !changes.data.isFirstChange()) {
            this.writeValue(changes.data.currentValue);
        }
    }
    // Implementing the AfterViewInit interface.
    ngAfterViewInit() {
        this.attachToWatchdog();
    }
    // Implementing the OnDestroy interface.
    ngOnDestroy() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.watchdog) {
                yield this.watchdog.remove(this.id);
            }
            else if (this.editorWatchdog && this.editorWatchdog.editor) {
                yield this.editorWatchdog.destroy();
                this.editorWatchdog = undefined;
            }
        });
    }
    // Implementing the ControlValueAccessor interface (only when binding to ngModel).
    writeValue(value) {
        // This method is called with the `null` value when the form resets.
        // A component's responsibility is to restore to the initial state.
        if (value === null) {
            value = '';
        }
        // If already initialized.
        if (this.editorInstance) {
            // The lock mechanism prevents from calling `cvaOnChange()` during changing
            // the editor state. See #139
            this.isEditorSettingData = true;
            this.editorInstance.setData(value);
            this.isEditorSettingData = false;
        }
        // If not, wait for it to be ready; store the data.
        else {
            // If the editor element is already available, then update its content.
            this.data = value;
            // If not, then wait until it is ready
            // and change data only for the first `ready` event.
            this.ready
                .pipe(first())
                .subscribe((editor) => {
                editor.setData(this.data);
            });
        }
    }
    // Implementing the ControlValueAccessor interface (only when binding to ngModel).
    registerOnChange(callback) {
        this.cvaOnChange = callback;
    }
    // Implementing the ControlValueAccessor interface (only when binding to ngModel).
    registerOnTouched(callback) {
        this.cvaOnTouched = callback;
    }
    // Implementing the ControlValueAccessor interface (only when binding to ngModel).
    setDisabledState(isDisabled) {
        // If already initialized.
        if (this.editorInstance) {
            this.editorInstance.isReadOnly = isDisabled;
        }
        // Store the state anyway to use it once the editor is created.
        this.initiallyDisabled = isDisabled;
    }
    /**
     * Creates the editor instance, sets initial editor data, then integrates
     * the editor with the Angular component. This method does not use the `editor.setData()`
     * because of the issue in the collaboration mode (#6).
     */
    attachToWatchdog() {
        const creator = (element, config) => __awaiter(this, void 0, void 0, function* () {
            return this.ngZone.runOutsideAngular(() => __awaiter(this, void 0, void 0, function* () {
                this.elementRef.nativeElement.appendChild(element);
                const editor = yield this.editor.create(element, config);
                if (this.initiallyDisabled) {
                    editor.isReadOnly = this.initiallyDisabled;
                }
                this.ngZone.run(() => {
                    this.ready.emit(editor);
                });
                this.setUpEditorEvents(editor);
                return editor;
            }));
        });
        const destructor = (editor) => __awaiter(this, void 0, void 0, function* () {
            yield editor.destroy();
            this.elementRef.nativeElement.removeChild(this.editorElement);
        });
        const emitError = () => {
            this.ngZone.run(() => {
                this.error.emit();
            });
        };
        const element = document.createElement(this.tagName);
        const config = this.getConfig();
        this.editorElement = element;
        // Based on the presence of the watchdog decide how to initialize the editor.
        if (this.watchdog) {
            // When the context watchdog is passed add the new item to it based on the passed configuration.
            this.watchdog.add({
                id: this.id,
                type: 'editor',
                creator,
                destructor,
                sourceElementOrData: element,
                config
            });
            this.watchdog.on('itemError', (_, { itemId }) => {
                if (itemId === this.id) {
                    emitError();
                }
            });
        }
        else {
            // In the other case create the watchdog by hand to keep the editor running.
            const editorWatchdog = new EditorWatchdog(this.editor);
            editorWatchdog.setCreator(creator);
            editorWatchdog.setDestructor(destructor);
            editorWatchdog.on('error', emitError);
            this.editorWatchdog = editorWatchdog;
            this.editorWatchdog.create(element, config);
        }
    }
    getConfig() {
        if (this.data && this.config.initialData) {
            throw new Error('Editor data should be provided either using `config.initialData` or `data` properties.');
        }
        const config = Object.assign({}, this.config);
        // Merge two possible ways of providing data into the `config.initialData` field.
        const initialData = this.config.initialData || this.data;
        if (initialData) {
            // Define the `config.initialData` only when the initial content is specified.
            config.initialData = initialData;
        }
        return config;
    }
    /**
     * Integrates the editor with the component by attaching related event listeners.
     */
    setUpEditorEvents(editor) {
        const modelDocument = editor.model.document;
        const viewDocument = editor.editing.view.document;
        modelDocument.on('change:data', (evt) => {
            this.ngZone.run(() => {
                if (this.cvaOnChange && !this.isEditorSettingData) {
                    const data = editor.getData();
                    this.cvaOnChange(data);
                }
                this.change.emit({ event: evt, editor });
            });
        });
        viewDocument.on('focus', (evt) => {
            this.ngZone.run(() => {
                this.focus.emit({ event: evt, editor });
            });
        });
        viewDocument.on('blur', (evt) => {
            this.ngZone.run(() => {
                if (this.cvaOnTouched) {
                    this.cvaOnTouched();
                }
                this.blur.emit({ event: evt, editor });
            });
        });
    }
}
CKEditorComponent.decorators = [
    { type: Component, args: [{
                selector: 'ckeditor',
                template: '<ng-template></ng-template>',
                // Integration with @angular/forms.
                providers: [
                    {
                        provide: NG_VALUE_ACCESSOR,
                        // eslint-disable-next-line @typescript-eslint/no-use-before-define
                        useExisting: forwardRef(() => CKEditorComponent),
                        multi: true
                    }
                ]
            },] }
];
CKEditorComponent.ctorParameters = () => [
    { type: ElementRef },
    { type: NgZone }
];
CKEditorComponent.propDecorators = {
    editor: [{ type: Input }],
    config: [{ type: Input }],
    data: [{ type: Input }],
    tagName: [{ type: Input }],
    watchdog: [{ type: Input }],
    disabled: [{ type: Input }],
    ready: [{ type: Output }],
    change: [{ type: Output }],
    blur: [{ type: Output }],
    focus: [{ type: Output }],
    error: [{ type: Output }]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2tlZGl0b3IuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Ii4uLy4uL3NyYy9ja2VkaXRvci8iLCJzb3VyY2VzIjpbImNrZWRpdG9yLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7O0FBRUgsT0FBTyxFQUNOLFNBQVMsRUFDVCxLQUFLLEVBQ0wsTUFBTSxFQUNOLE1BQU0sRUFDTixZQUFZLEVBQ1osVUFBVSxFQUVWLFVBQVUsRUFDVixNQUFNLGVBQWUsQ0FBQztBQUV2QixPQUFPLGNBQWMsTUFBTSxpREFBaUQsQ0FBQztBQUM3RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFdkMsT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDO0FBRXhCLE9BQU8sRUFFTixpQkFBaUIsRUFDakIsTUFBTSxnQkFBZ0IsQ0FBQztBQWlDeEIsTUFBTSxPQUFPLGlCQUFpQjtJQXlKN0IsWUFBb0IsVUFBc0IsRUFBRSxNQUFjO1FBN0kxRDs7OztXQUlHO1FBQ2EsV0FBTSxHQUFxQixFQUFFLENBQUM7UUFFOUM7OztXQUdHO1FBQ2EsU0FBSSxHQUFHLEVBQUUsQ0FBQztRQUUxQjs7OztXQUlHO1FBQ2EsWUFBTyxHQUFHLEtBQUssQ0FBQztRQXdCaEM7Ozs7V0FJRztRQUNjLFVBQUssR0FBRyxJQUFJLFlBQVksRUFBb0IsQ0FBQztRQUU5RDs7OztXQUlHO1FBQ2MsV0FBTSxHQUE4QixJQUFJLFlBQVksRUFBZSxDQUFDO1FBRXJGOzs7O1dBSUc7UUFDYyxTQUFJLEdBQTRCLElBQUksWUFBWSxFQUFhLENBQUM7UUFFL0U7Ozs7V0FJRztRQUNjLFVBQUssR0FBNkIsSUFBSSxZQUFZLEVBQWMsQ0FBQztRQUVsRjs7V0FFRztRQUNjLFVBQUssR0FBdUIsSUFBSSxZQUFZLEVBQVEsQ0FBQztRQTRCdEU7OztXQUdHO1FBQ0ssc0JBQWlCLEdBQUcsS0FBSyxDQUFDO1FBNkJsQzs7V0FFRztRQUNLLHdCQUFtQixHQUFHLEtBQUss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QyxDQUFFLENBQUM7SUFDTCxDQUFDOzs7WUF4WEQsU0FBUyxTQUFFO2dCQUNYLFFBQVEsRUFBRSxVQUFVO2dCQUNwQixRQUFRLEVBQUUsNkJBQTZCO2dCQUV2QyxtQ0FBbUM7Z0JBQ25DLFNBQVMsRUFBRTtvQkFDVjt3QkFDQyxPQUFPLEVBQUUsaUJBQWlCO3dCQUMxQixtRUFBbUU7d0JBQ25FLFdBQVcsRUFBRSxVQUFVLENBQUUsR0FBRyxFQUFFLENBQUMsaUJBQWlCLENBQUU7d0JBQ2xELEtBQUssRUFBRSxJQUFJO3FCQUNYO2lCQUNEO2FBQ0Q7OztZQTNDQSxVQUFVO1lBSlYsTUFBTTs7O3FCQTBETCxLQUFLO3FCQU9MLEtBQUs7bUJBTUwsS0FBSztzQkFPTCxLQUFLO3VCQUtMLEtBQUs7dUJBT0wsS0FBSztvQkFpQkwsTUFBTTtxQkFPTixNQUFNO21CQU9OLE1BQU07b0JBT04sTUFBTTtvQkFLTixNQUFNIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEBsaWNlbnNlIENvcHlyaWdodCAoYykgMjAwMy0yMDIxLCBDS1NvdXJjZSAtIEZyZWRlcmljbyBLbmFiYmVuLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxyXG4gKiBGb3IgbGljZW5zaW5nLCBzZWUgTElDRU5TRS5tZC5cclxuICovXHJcblxyXG5pbXBvcnQge1xyXG5cdENvbXBvbmVudCxcclxuXHRJbnB1dCxcclxuXHRPdXRwdXQsXHJcblx0Tmdab25lLFxyXG5cdEV2ZW50RW1pdHRlcixcclxuXHRmb3J3YXJkUmVmLFxyXG5cdEFmdGVyVmlld0luaXQsICBPbkNoYW5nZXMsIE9uRGVzdHJveSwgU2ltcGxlQ2hhbmdlcyxcclxuXHRFbGVtZW50UmVmXHJcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XHJcblxyXG5pbXBvcnQgRWRpdG9yV2F0Y2hkb2cgZnJvbSAnQGNrZWRpdG9yL2NrZWRpdG9yNS13YXRjaGRvZy9zcmMvZWRpdG9yd2F0Y2hkb2cnO1xyXG5pbXBvcnQgeyBmaXJzdCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcclxuXHJcbmltcG9ydCB1aWQgZnJvbSAnLi91aWQnO1xyXG5cclxuaW1wb3J0IHtcclxuXHRDb250cm9sVmFsdWVBY2Nlc3NvcixcclxuXHROR19WQUxVRV9BQ0NFU1NPUlxyXG59IGZyb20gJ0Bhbmd1bGFyL2Zvcm1zJztcclxuXHJcbmltcG9ydCB7IENLRWRpdG9yNSB9IGZyb20gJy4vY2tlZGl0b3InO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBCbHVyRXZlbnQge1xyXG5cdGV2ZW50OiBDS0VkaXRvcjUuRXZlbnRJbmZvPCdibHVyJz47XHJcblx0ZWRpdG9yOiBDS0VkaXRvcjUuRWRpdG9yO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZvY3VzRXZlbnQge1xyXG5cdGV2ZW50OiBDS0VkaXRvcjUuRXZlbnRJbmZvPCdmb2N1cyc+O1xyXG5cdGVkaXRvcjogQ0tFZGl0b3I1LkVkaXRvcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDaGFuZ2VFdmVudCB7XHJcblx0ZXZlbnQ6IENLRWRpdG9yNS5FdmVudEluZm88J2NoYW5nZTpkYXRhJz47XHJcblx0ZWRpdG9yOiBDS0VkaXRvcjUuRWRpdG9yO1xyXG59XHJcblxyXG5AQ29tcG9uZW50KCB7XHJcblx0c2VsZWN0b3I6ICdja2VkaXRvcicsXHJcblx0dGVtcGxhdGU6ICc8bmctdGVtcGxhdGU+PC9uZy10ZW1wbGF0ZT4nLFxyXG5cclxuXHQvLyBJbnRlZ3JhdGlvbiB3aXRoIEBhbmd1bGFyL2Zvcm1zLlxyXG5cdHByb3ZpZGVyczogW1xyXG5cdFx0e1xyXG5cdFx0XHRwcm92aWRlOiBOR19WQUxVRV9BQ0NFU1NPUixcclxuXHRcdFx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11c2UtYmVmb3JlLWRlZmluZVxyXG5cdFx0XHR1c2VFeGlzdGluZzogZm9yd2FyZFJlZiggKCkgPT4gQ0tFZGl0b3JDb21wb25lbnQgKSxcclxuXHRcdFx0bXVsdGk6IHRydWVcclxuXHRcdH1cclxuXHRdXHJcbn0gKVxyXG5leHBvcnQgY2xhc3MgQ0tFZGl0b3JDb21wb25lbnQgaW1wbGVtZW50cyBBZnRlclZpZXdJbml0LCBPbkRlc3Ryb3ksT25DaGFuZ2VzLCBDb250cm9sVmFsdWVBY2Nlc3NvciB7XHJcblx0LyoqXHJcblx0ICogVGhlIHJlZmVyZW5jZSB0byB0aGUgRE9NIGVsZW1lbnQgY3JlYXRlZCBieSB0aGUgY29tcG9uZW50LlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZWxlbWVudFJlZiE6IEVsZW1lbnRSZWY8SFRNTEVsZW1lbnQ+O1xyXG5cclxuXHQvKipcclxuXHQgKiBUaGUgY29uc3RydWN0b3Igb2YgdGhlIGVkaXRvciB0byBiZSB1c2VkIGZvciB0aGUgaW5zdGFuY2Ugb2YgdGhlIGNvbXBvbmVudC5cclxuXHQgKiBJdCBjYW4gYmUgZS5nLiB0aGUgYENsYXNzaWNFZGl0b3JCdWlsZGAsIGBJbmxpbmVFZGl0b3JCdWlsZGAgb3Igc29tZSBjdXN0b20gZWRpdG9yLlxyXG5cdCAqL1xyXG5cdEBJbnB1dCgpIHB1YmxpYyBlZGl0b3I/OiBDS0VkaXRvcjUuRWRpdG9yQ29uc3RydWN0b3I7XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRoZSBjb25maWd1cmF0aW9uIG9mIHRoZSBlZGl0b3IuXHJcblx0ICogU2VlIGh0dHBzOi8vY2tlZGl0b3IuY29tL2RvY3MvY2tlZGl0b3I1L2xhdGVzdC9hcGkvbW9kdWxlX2NvcmVfZWRpdG9yX2VkaXRvcmNvbmZpZy1FZGl0b3JDb25maWcuaHRtbFxyXG5cdCAqIHRvIGxlYXJuIG1vcmUuXHJcblx0ICovXHJcblx0QElucHV0KCkgcHVibGljIGNvbmZpZzogQ0tFZGl0b3I1LkNvbmZpZyA9IHt9O1xyXG5cclxuXHQvKipcclxuXHQgKiBUaGUgaW5pdGlhbCBkYXRhIG9mIHRoZSBlZGl0b3IuIFVzZWZ1bCB3aGVuIG5vdCB1c2luZyB0aGUgbmdNb2RlbC5cclxuXHQgKiBTZWUgaHR0cHM6Ly9hbmd1bGFyLmlvL2FwaS9mb3Jtcy9OZ01vZGVsIHRvIGxlYXJuIG1vcmUuXHJcblx0ICovXHJcblx0QElucHV0KCkgcHVibGljIGRhdGEgPSAnJztcclxuXHJcblx0LyoqXHJcblx0ICogVGFnIG5hbWUgb2YgdGhlIGVkaXRvciBjb21wb25lbnQuXHJcblx0ICpcclxuXHQgKiBUaGUgZGVmYXVsdCB0YWcgaXMgJ2RpdicuXHJcblx0ICovXHJcblx0QElucHV0KCkgcHVibGljIHRhZ05hbWUgPSAnZGl2JztcclxuXHJcblx0LyoqXHJcblx0ICogVGhlIGNvbnRleHQgd2F0Y2hkb2cuXHJcblx0ICovXHJcblx0QElucHV0KCkgcHVibGljIHdhdGNoZG9nPzogQ0tFZGl0b3I1LkNvbnRleHRXYXRjaGRvZztcclxuXHJcblx0LyoqXHJcblx0ICogV2hlbiBzZXQgYHRydWVgLCB0aGUgZWRpdG9yIGJlY29tZXMgcmVhZC1vbmx5LlxyXG5cdCAqIFNlZSBodHRwczovL2NrZWRpdG9yLmNvbS9kb2NzL2NrZWRpdG9yNS9sYXRlc3QvYXBpL21vZHVsZV9jb3JlX2VkaXRvcl9lZGl0b3ItRWRpdG9yLmh0bWwjbWVtYmVyLWlzUmVhZE9ubHlcclxuXHQgKiB0byBsZWFybiBtb3JlLlxyXG5cdCAqL1xyXG5cdEBJbnB1dCgpIHB1YmxpYyBzZXQgZGlzYWJsZWQoIGlzRGlzYWJsZWQ6IGJvb2xlYW4gKSB7XHJcblx0XHR0aGlzLnNldERpc2FibGVkU3RhdGUoIGlzRGlzYWJsZWQgKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBnZXQgZGlzYWJsZWQoKTogYm9vbGVhbiB7XHJcblx0XHRpZiAoIHRoaXMuZWRpdG9ySW5zdGFuY2UgKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLmVkaXRvckluc3RhbmNlLmlzUmVhZE9ubHk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuaW5pdGlhbGx5RGlzYWJsZWQ7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGaXJlcyB3aGVuIHRoZSBlZGl0b3IgaXMgcmVhZHkuIEl0IGNvcnJlc3BvbmRzIHdpdGggdGhlIGBlZGl0b3IjcmVhZHlgXHJcblx0ICogaHR0cHM6Ly9ja2VkaXRvci5jb20vZG9jcy9ja2VkaXRvcjUvbGF0ZXN0L2FwaS9tb2R1bGVfY29yZV9lZGl0b3JfZWRpdG9yLUVkaXRvci5odG1sI2V2ZW50LXJlYWR5XHJcblx0ICogZXZlbnQuXHJcblx0ICovXHJcblx0QE91dHB1dCgpIHB1YmxpYyByZWFkeSA9IG5ldyBFdmVudEVtaXR0ZXI8Q0tFZGl0b3I1LkVkaXRvcj4oKTtcclxuXHJcblx0LyoqXHJcblx0ICogRmlyZXMgd2hlbiB0aGUgY29udGVudCBvZiB0aGUgZWRpdG9yIGhhcyBjaGFuZ2VkLiBJdCBjb3JyZXNwb25kcyB3aXRoIHRoZSBgZWRpdG9yLm1vZGVsLmRvY3VtZW50I2NoYW5nZWBcclxuXHQgKiBodHRwczovL2NrZWRpdG9yLmNvbS9kb2NzL2NrZWRpdG9yNS9sYXRlc3QvYXBpL21vZHVsZV9lbmdpbmVfbW9kZWxfZG9jdW1lbnQtRG9jdW1lbnQuaHRtbCNldmVudC1jaGFuZ2VcclxuXHQgKiBldmVudC5cclxuXHQgKi9cclxuXHRAT3V0cHV0KCkgcHVibGljIGNoYW5nZTogRXZlbnRFbWl0dGVyPENoYW5nZUV2ZW50PiA9IG5ldyBFdmVudEVtaXR0ZXI8Q2hhbmdlRXZlbnQ+KCk7XHJcblxyXG5cdC8qKlxyXG5cdCAqIEZpcmVzIHdoZW4gdGhlIGVkaXRpbmcgdmlldyBvZiB0aGUgZWRpdG9yIGlzIGJsdXJyZWQuIEl0IGNvcnJlc3BvbmRzIHdpdGggdGhlIGBlZGl0b3IuZWRpdGluZy52aWV3LmRvY3VtZW50I2JsdXJgXHJcblx0ICogaHR0cHM6Ly9ja2VkaXRvci5jb20vZG9jcy9ja2VkaXRvcjUvbGF0ZXN0L2FwaS9tb2R1bGVfZW5naW5lX3ZpZXdfZG9jdW1lbnQtRG9jdW1lbnQuaHRtbCNldmVudC1ldmVudDpibHVyXHJcblx0ICogZXZlbnQuXHJcblx0ICovXHJcblx0QE91dHB1dCgpIHB1YmxpYyBibHVyOiBFdmVudEVtaXR0ZXI8Qmx1ckV2ZW50PiA9IG5ldyBFdmVudEVtaXR0ZXI8Qmx1ckV2ZW50PigpO1xyXG5cclxuXHQvKipcclxuXHQgKiBGaXJlcyB3aGVuIHRoZSBlZGl0aW5nIHZpZXcgb2YgdGhlIGVkaXRvciBpcyBmb2N1c2VkLiBJdCBjb3JyZXNwb25kcyB3aXRoIHRoZSBgZWRpdG9yLmVkaXRpbmcudmlldy5kb2N1bWVudCNmb2N1c2BcclxuXHQgKiBodHRwczovL2NrZWRpdG9yLmNvbS9kb2NzL2NrZWRpdG9yNS9sYXRlc3QvYXBpL21vZHVsZV9lbmdpbmVfdmlld19kb2N1bWVudC1Eb2N1bWVudC5odG1sI2V2ZW50LWV2ZW50OmZvY3VzXHJcblx0ICogZXZlbnQuXHJcblx0ICovXHJcblx0QE91dHB1dCgpIHB1YmxpYyBmb2N1czogRXZlbnRFbWl0dGVyPEZvY3VzRXZlbnQ+ID0gbmV3IEV2ZW50RW1pdHRlcjxGb2N1c0V2ZW50PigpO1xyXG5cclxuXHQvKipcclxuXHQgKiBGaXJlcyB3aGVuIHRoZSBlZGl0b3IgY29tcG9uZW50IGNyYXNoZXMuXHJcblx0ICovXHJcblx0QE91dHB1dCgpIHB1YmxpYyBlcnJvcjogRXZlbnRFbWl0dGVyPHZvaWQ+ID0gbmV3IEV2ZW50RW1pdHRlcjx2b2lkPigpO1xyXG5cclxuXHQvKipcclxuXHQgKiBUaGUgaW5zdGFuY2Ugb2YgdGhlIGVkaXRvciBjcmVhdGVkIGJ5IHRoaXMgY29tcG9uZW50LlxyXG5cdCAqL1xyXG5cdHB1YmxpYyBnZXQgZWRpdG9ySW5zdGFuY2UoKTogQ0tFZGl0b3I1LkVkaXRvciB8IG51bGwge1xyXG5cdFx0bGV0IGVkaXRvcldhdGNoZG9nID0gdGhpcy5lZGl0b3JXYXRjaGRvZztcclxuXHJcblx0XHRpZiAoIHRoaXMud2F0Y2hkb2cgKSB7XHJcblx0XHRcdC8vIFRlbXBvcmFyaWx5IHVzZSB0aGUgYF93YXRjaGRvZ3NgIGludGVybmFsIG1hcCBhcyB0aGUgYGdldEl0ZW0oKWAgbWV0aG9kIHRocm93c1xyXG5cdFx0XHQvLyBhbiBlcnJvciB3aGVuIHRoZSBpdGVtIGlzIG5vdCByZWdpc3RlcmVkIHlldC5cclxuXHRcdFx0Ly8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ja2VkaXRvci9ja2VkaXRvcjUtYW5ndWxhci9pc3N1ZXMvMTc3LlxyXG5cdFx0XHRlZGl0b3JXYXRjaGRvZyA9IHRoaXMud2F0Y2hkb2cuX3dhdGNoZG9ncy5nZXQoIHRoaXMuaWQgKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIGVkaXRvcldhdGNoZG9nICkge1xyXG5cdFx0XHRyZXR1cm4gZWRpdG9yV2F0Y2hkb2cuZWRpdG9yO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVGhlIGVkaXRvciB3YXRjaGRvZy4gSXQgaXMgY3JlYXRlZCB3aGVuIHRoZSBjb250ZXh0IHdhdGNoZG9nIGlzIG5vdCBwYXNzZWQgdG8gdGhlIGNvbXBvbmVudC5cclxuXHQgKiBJdCBrZWVwcyB0aGUgZWRpdG9yIHJ1bm5pbmcuXHJcblx0ICovXHJcblx0cHJpdmF0ZSBlZGl0b3JXYXRjaGRvZz86IENLRWRpdG9yNS5FZGl0b3JXYXRjaGRvZztcclxuXHJcblx0LyoqXHJcblx0ICogSWYgdGhlIGNvbXBvbmVudCBpcyByZWFk4oCTb25seSBiZWZvcmUgdGhlIGVkaXRvciBpbnN0YW5jZSBpcyBjcmVhdGVkLCBpdCByZW1lbWJlcnMgdGhhdCBzdGF0ZSxcclxuXHQgKiBzbyB0aGUgZWRpdG9yIGNhbiBiZWNvbWUgcmVhZOKAk29ubHkgb25jZSBpdCBpcyByZWFkeS5cclxuXHQgKi9cclxuXHRwcml2YXRlIGluaXRpYWxseURpc2FibGVkID0gZmFsc2U7XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFuIGluc3RhbmNlIG9mIGh0dHBzOi8vYW5ndWxhci5pby9hcGkvY29yZS9OZ1pvbmUgdG8gYWxsb3cgdGhlIGludGVyYWN0aW9uIHdpdGggdGhlIGVkaXRvclxyXG5cdCAqIHdpdGhpbmcgdGhlIEFuZ3VsYXIgZXZlbnQgbG9vcC5cclxuXHQgKi9cclxuXHRwcml2YXRlIG5nWm9uZTogTmdab25lO1xyXG5cclxuXHQvKipcclxuXHQgKiBBIGNhbGxiYWNrIGV4ZWN1dGVkIHdoZW4gdGhlIGNvbnRlbnQgb2YgdGhlIGVkaXRvciBjaGFuZ2VzLiBQYXJ0IG9mIHRoZVxyXG5cdCAqIGBDb250cm9sVmFsdWVBY2Nlc3NvcmAgKGh0dHBzOi8vYW5ndWxhci5pby9hcGkvZm9ybXMvQ29udHJvbFZhbHVlQWNjZXNzb3IpIGludGVyZmFjZS5cclxuXHQgKlxyXG5cdCAqIE5vdGU6IFVuc2V0IHVubGVzcyB0aGUgY29tcG9uZW50IHVzZXMgdGhlIGBuZ01vZGVsYC5cclxuXHQgKi9cclxuXHRwcml2YXRlIGN2YU9uQ2hhbmdlPzogKCBkYXRhOiBzdHJpbmcgKSA9PiB2b2lkO1xyXG5cclxuXHQvKipcclxuXHQgKiBBIGNhbGxiYWNrIGV4ZWN1dGVkIHdoZW4gdGhlIGVkaXRvciBoYXMgYmVlbiBibHVycmVkLiBQYXJ0IG9mIHRoZVxyXG5cdCAqIGBDb250cm9sVmFsdWVBY2Nlc3NvcmAgKGh0dHBzOi8vYW5ndWxhci5pby9hcGkvZm9ybXMvQ29udHJvbFZhbHVlQWNjZXNzb3IpIGludGVyZmFjZS5cclxuXHQgKlxyXG5cdCAqIE5vdGU6IFVuc2V0IHVubGVzcyB0aGUgY29tcG9uZW50IHVzZXMgdGhlIGBuZ01vZGVsYC5cclxuXHQgKi9cclxuXHRwcml2YXRlIGN2YU9uVG91Y2hlZD86ICgpID0+IHZvaWQ7XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlZmVyZW5jZSB0byB0aGUgc291cmNlIGVsZW1lbnQgdXNlZCBieSB0aGUgZWRpdG9yLlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZWRpdG9yRWxlbWVudD86IEhUTUxFbGVtZW50O1xyXG5cclxuXHQvKipcclxuXHQgKiBBIGxvY2sgZmxhZyBwcmV2ZW50aW5nIGZyb20gY2FsbGluZyB0aGUgYGN2YU9uQ2hhbmdlKClgIGR1cmluZyBzZXR0aW5nIGVkaXRvciBkYXRhLlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaXNFZGl0b3JTZXR0aW5nRGF0YSA9IGZhbHNlO1xyXG5cclxuXHRwcml2YXRlIGlkID0gdWlkKCk7XHJcblxyXG5cdHB1YmxpYyBjb25zdHJ1Y3RvciggZWxlbWVudFJlZjogRWxlbWVudFJlZiwgbmdab25lOiBOZ1pvbmUgKSB7XHJcblx0XHR0aGlzLm5nWm9uZSA9IG5nWm9uZTtcclxuXHRcdHRoaXMuZWxlbWVudFJlZiA9IGVsZW1lbnRSZWY7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKkltcGxlbWVudGluZyB0aGUgT25DaGFuZ2VzIGludGVyZmFjZS5cclxuXHQgKldoZW5ldmVyICdkYXRhJyBwcm9wZXJ0eSBjaGFuZ2VzIHdlIG5lZWQgdG8gdXBkYXRlIHRoZSBjb250ZW50cyBvZiB0aGUgZWRpdG9yLlxyXG5cdCovXHJcblx0cHVibGljIG5nT25DaGFuZ2VzKCBjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzICk6IHZvaWQge1xyXG5cdFx0aWYgKCBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoIGNoYW5nZXMsICdkYXRhJyApICYmIGNoYW5nZXMuZGF0YSAmJiAhY2hhbmdlcy5kYXRhLmlzRmlyc3RDaGFuZ2UoKSApIHtcclxuXHRcdFx0dGhpcy53cml0ZVZhbHVlKCBjaGFuZ2VzLmRhdGEuY3VycmVudFZhbHVlICk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBJbXBsZW1lbnRpbmcgdGhlIEFmdGVyVmlld0luaXQgaW50ZXJmYWNlLlxyXG5cdHB1YmxpYyBuZ0FmdGVyVmlld0luaXQoKTogdm9pZCB7XHJcblx0XHR0aGlzLmF0dGFjaFRvV2F0Y2hkb2coKTtcclxuXHR9XHJcblxyXG5cdC8vIEltcGxlbWVudGluZyB0aGUgT25EZXN0cm95IGludGVyZmFjZS5cclxuXHRwdWJsaWMgYXN5bmMgbmdPbkRlc3Ryb3koKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRpZiAoIHRoaXMud2F0Y2hkb2cgKSB7XHJcblx0XHRcdGF3YWl0IHRoaXMud2F0Y2hkb2cucmVtb3ZlKCB0aGlzLmlkICk7XHJcblx0XHR9IGVsc2UgaWYgKCB0aGlzLmVkaXRvcldhdGNoZG9nICYmIHRoaXMuZWRpdG9yV2F0Y2hkb2cuZWRpdG9yICkge1xyXG5cdFx0XHRhd2FpdCB0aGlzLmVkaXRvcldhdGNoZG9nLmRlc3Ryb3koKTtcclxuXHJcblx0XHRcdHRoaXMuZWRpdG9yV2F0Y2hkb2cgPSB1bmRlZmluZWQ7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBJbXBsZW1lbnRpbmcgdGhlIENvbnRyb2xWYWx1ZUFjY2Vzc29yIGludGVyZmFjZSAob25seSB3aGVuIGJpbmRpbmcgdG8gbmdNb2RlbCkuXHJcblx0cHVibGljIHdyaXRlVmFsdWUoIHZhbHVlOiBzdHJpbmcgfCBudWxsICk6IHZvaWQge1xyXG5cdFx0Ly8gVGhpcyBtZXRob2QgaXMgY2FsbGVkIHdpdGggdGhlIGBudWxsYCB2YWx1ZSB3aGVuIHRoZSBmb3JtIHJlc2V0cy5cclxuXHRcdC8vIEEgY29tcG9uZW50J3MgcmVzcG9uc2liaWxpdHkgaXMgdG8gcmVzdG9yZSB0byB0aGUgaW5pdGlhbCBzdGF0ZS5cclxuXHRcdGlmICggdmFsdWUgPT09IG51bGwgKSB7XHJcblx0XHRcdHZhbHVlID0gJyc7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgYWxyZWFkeSBpbml0aWFsaXplZC5cclxuXHRcdGlmICggdGhpcy5lZGl0b3JJbnN0YW5jZSApIHtcclxuXHRcdFx0Ly8gVGhlIGxvY2sgbWVjaGFuaXNtIHByZXZlbnRzIGZyb20gY2FsbGluZyBgY3ZhT25DaGFuZ2UoKWAgZHVyaW5nIGNoYW5naW5nXHJcblx0XHRcdC8vIHRoZSBlZGl0b3Igc3RhdGUuIFNlZSAjMTM5XHJcblx0XHRcdHRoaXMuaXNFZGl0b3JTZXR0aW5nRGF0YSA9IHRydWU7XHJcblx0XHRcdHRoaXMuZWRpdG9ySW5zdGFuY2Uuc2V0RGF0YSggdmFsdWUgKTtcclxuXHRcdFx0dGhpcy5pc0VkaXRvclNldHRpbmdEYXRhID0gZmFsc2U7XHJcblx0XHR9XHJcblx0XHQvLyBJZiBub3QsIHdhaXQgZm9yIGl0IHRvIGJlIHJlYWR5OyBzdG9yZSB0aGUgZGF0YS5cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHQvLyBJZiB0aGUgZWRpdG9yIGVsZW1lbnQgaXMgYWxyZWFkeSBhdmFpbGFibGUsIHRoZW4gdXBkYXRlIGl0cyBjb250ZW50LlxyXG5cdFx0XHR0aGlzLmRhdGEgPSB2YWx1ZTtcclxuXHJcblx0XHRcdC8vIElmIG5vdCwgdGhlbiB3YWl0IHVudGlsIGl0IGlzIHJlYWR5XHJcblx0XHRcdC8vIGFuZCBjaGFuZ2UgZGF0YSBvbmx5IGZvciB0aGUgZmlyc3QgYHJlYWR5YCBldmVudC5cclxuXHRcdFx0dGhpcy5yZWFkeVxyXG5cdFx0XHRcdC5waXBlKCBmaXJzdCgpIClcclxuXHRcdFx0XHQuc3Vic2NyaWJlKCAoIGVkaXRvcjogQ0tFZGl0b3I1LkVkaXRvciApID0+IHtcclxuXHRcdFx0XHRcdGVkaXRvci5zZXREYXRhKCB0aGlzLmRhdGEgKTtcclxuXHRcdFx0XHR9ICk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBJbXBsZW1lbnRpbmcgdGhlIENvbnRyb2xWYWx1ZUFjY2Vzc29yIGludGVyZmFjZSAob25seSB3aGVuIGJpbmRpbmcgdG8gbmdNb2RlbCkuXHJcblx0cHVibGljIHJlZ2lzdGVyT25DaGFuZ2UoIGNhbGxiYWNrOiAoIGRhdGE6IHN0cmluZyApID0+IHZvaWQgKTogdm9pZCB7XHJcblx0XHR0aGlzLmN2YU9uQ2hhbmdlID0gY2FsbGJhY2s7XHJcblx0fVxyXG5cclxuXHQvLyBJbXBsZW1lbnRpbmcgdGhlIENvbnRyb2xWYWx1ZUFjY2Vzc29yIGludGVyZmFjZSAob25seSB3aGVuIGJpbmRpbmcgdG8gbmdNb2RlbCkuXHJcblx0cHVibGljIHJlZ2lzdGVyT25Ub3VjaGVkKCBjYWxsYmFjazogKCkgPT4gdm9pZCApOiB2b2lkIHtcclxuXHRcdHRoaXMuY3ZhT25Ub3VjaGVkID0gY2FsbGJhY2s7XHJcblx0fVxyXG5cclxuXHQvLyBJbXBsZW1lbnRpbmcgdGhlIENvbnRyb2xWYWx1ZUFjY2Vzc29yIGludGVyZmFjZSAob25seSB3aGVuIGJpbmRpbmcgdG8gbmdNb2RlbCkuXHJcblx0cHVibGljIHNldERpc2FibGVkU3RhdGUoIGlzRGlzYWJsZWQ6IGJvb2xlYW4gKTogdm9pZCB7XHJcblx0XHQvLyBJZiBhbHJlYWR5IGluaXRpYWxpemVkLlxyXG5cdFx0aWYgKCB0aGlzLmVkaXRvckluc3RhbmNlICkge1xyXG5cdFx0XHR0aGlzLmVkaXRvckluc3RhbmNlLmlzUmVhZE9ubHkgPSBpc0Rpc2FibGVkO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFN0b3JlIHRoZSBzdGF0ZSBhbnl3YXkgdG8gdXNlIGl0IG9uY2UgdGhlIGVkaXRvciBpcyBjcmVhdGVkLlxyXG5cdFx0dGhpcy5pbml0aWFsbHlEaXNhYmxlZCA9IGlzRGlzYWJsZWQ7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGVzIHRoZSBlZGl0b3IgaW5zdGFuY2UsIHNldHMgaW5pdGlhbCBlZGl0b3IgZGF0YSwgdGhlbiBpbnRlZ3JhdGVzXHJcblx0ICogdGhlIGVkaXRvciB3aXRoIHRoZSBBbmd1bGFyIGNvbXBvbmVudC4gVGhpcyBtZXRob2QgZG9lcyBub3QgdXNlIHRoZSBgZWRpdG9yLnNldERhdGEoKWBcclxuXHQgKiBiZWNhdXNlIG9mIHRoZSBpc3N1ZSBpbiB0aGUgY29sbGFib3JhdGlvbiBtb2RlICgjNikuXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhdHRhY2hUb1dhdGNoZG9nKCkge1xyXG5cdFx0Y29uc3QgY3JlYXRvciA9IGFzeW5jICggZWxlbWVudDogSFRNTEVsZW1lbnQsIGNvbmZpZzogQ0tFZGl0b3I1LkNvbmZpZyApID0+IHtcclxuXHRcdFx0cmV0dXJuIHRoaXMubmdab25lLnJ1bk91dHNpZGVBbmd1bGFyKCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQuYXBwZW5kQ2hpbGQoIGVsZW1lbnQgKTtcclxuXHJcblx0XHRcdFx0Y29uc3QgZWRpdG9yID0gYXdhaXQgdGhpcy5lZGl0b3IhLmNyZWF0ZSggZWxlbWVudCwgY29uZmlnICk7XHJcblxyXG5cdFx0XHRcdGlmICggdGhpcy5pbml0aWFsbHlEaXNhYmxlZCApIHtcclxuXHRcdFx0XHRcdGVkaXRvci5pc1JlYWRPbmx5ID0gdGhpcy5pbml0aWFsbHlEaXNhYmxlZDtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHRoaXMubmdab25lLnJ1biggKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5yZWFkeS5lbWl0KCBlZGl0b3IgKTtcclxuXHRcdFx0XHR9ICk7XHJcblxyXG5cdFx0XHRcdHRoaXMuc2V0VXBFZGl0b3JFdmVudHMoIGVkaXRvciApO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gZWRpdG9yO1xyXG5cdFx0XHR9ICk7XHJcblx0XHR9O1xyXG5cclxuXHRcdGNvbnN0IGRlc3RydWN0b3IgPSBhc3luYyAoIGVkaXRvcjogQ0tFZGl0b3I1LkVkaXRvciApID0+IHtcclxuXHRcdFx0YXdhaXQgZWRpdG9yLmRlc3Ryb3koKTtcclxuXHJcblx0XHRcdHRoaXMuZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50LnJlbW92ZUNoaWxkKCB0aGlzLmVkaXRvckVsZW1lbnQhICk7XHJcblx0XHR9O1xyXG5cclxuXHRcdGNvbnN0IGVtaXRFcnJvciA9ICgpID0+IHtcclxuXHRcdFx0dGhpcy5uZ1pvbmUucnVuKCAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5lcnJvci5lbWl0KCk7XHJcblx0XHRcdH0gKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Y29uc3QgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIHRoaXMudGFnTmFtZSApO1xyXG5cdFx0Y29uc3QgY29uZmlnID0gdGhpcy5nZXRDb25maWcoKTtcclxuXHJcblx0XHR0aGlzLmVkaXRvckVsZW1lbnQgPSBlbGVtZW50O1xyXG5cclxuXHRcdC8vIEJhc2VkIG9uIHRoZSBwcmVzZW5jZSBvZiB0aGUgd2F0Y2hkb2cgZGVjaWRlIGhvdyB0byBpbml0aWFsaXplIHRoZSBlZGl0b3IuXHJcblx0XHRpZiAoIHRoaXMud2F0Y2hkb2cgKSB7XHJcblx0XHRcdC8vIFdoZW4gdGhlIGNvbnRleHQgd2F0Y2hkb2cgaXMgcGFzc2VkIGFkZCB0aGUgbmV3IGl0ZW0gdG8gaXQgYmFzZWQgb24gdGhlIHBhc3NlZCBjb25maWd1cmF0aW9uLlxyXG5cdFx0XHR0aGlzLndhdGNoZG9nLmFkZCgge1xyXG5cdFx0XHRcdGlkOiB0aGlzLmlkLFxyXG5cdFx0XHRcdHR5cGU6ICdlZGl0b3InLFxyXG5cdFx0XHRcdGNyZWF0b3IsXHJcblx0XHRcdFx0ZGVzdHJ1Y3RvcixcclxuXHRcdFx0XHRzb3VyY2VFbGVtZW50T3JEYXRhOiBlbGVtZW50LFxyXG5cdFx0XHRcdGNvbmZpZ1xyXG5cdFx0XHR9ICk7XHJcblxyXG5cdFx0XHR0aGlzLndhdGNoZG9nLm9uKCAnaXRlbUVycm9yJywgKCBfLCB7IGl0ZW1JZCB9ICkgPT4ge1xyXG5cdFx0XHRcdGlmICggaXRlbUlkID09PSB0aGlzLmlkICkge1xyXG5cdFx0XHRcdFx0ZW1pdEVycm9yKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9ICk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBJbiB0aGUgb3RoZXIgY2FzZSBjcmVhdGUgdGhlIHdhdGNoZG9nIGJ5IGhhbmQgdG8ga2VlcCB0aGUgZWRpdG9yIHJ1bm5pbmcuXHJcblx0XHRcdGNvbnN0IGVkaXRvcldhdGNoZG9nOiBDS0VkaXRvcjUuRWRpdG9yV2F0Y2hkb2cgPSBuZXcgRWRpdG9yV2F0Y2hkb2coIHRoaXMuZWRpdG9yICk7XHJcblxyXG5cdFx0XHRlZGl0b3JXYXRjaGRvZy5zZXRDcmVhdG9yKCBjcmVhdG9yICk7XHJcblx0XHRcdGVkaXRvcldhdGNoZG9nLnNldERlc3RydWN0b3IoIGRlc3RydWN0b3IgKTtcclxuXHRcdFx0ZWRpdG9yV2F0Y2hkb2cub24oICdlcnJvcicsIGVtaXRFcnJvciApO1xyXG5cclxuXHRcdFx0dGhpcy5lZGl0b3JXYXRjaGRvZyA9IGVkaXRvcldhdGNoZG9nO1xyXG5cclxuXHRcdFx0dGhpcy5lZGl0b3JXYXRjaGRvZy5jcmVhdGUoIGVsZW1lbnQsIGNvbmZpZyApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXRDb25maWcoKSB7XHJcblx0XHRpZiAoIHRoaXMuZGF0YSAmJiB0aGlzLmNvbmZpZy5pbml0aWFsRGF0YSApIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCAnRWRpdG9yIGRhdGEgc2hvdWxkIGJlIHByb3ZpZGVkIGVpdGhlciB1c2luZyBgY29uZmlnLmluaXRpYWxEYXRhYCBvciBgZGF0YWAgcHJvcGVydGllcy4nICk7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgY29uZmlnID0geyAuLi50aGlzLmNvbmZpZyB9O1xyXG5cclxuXHRcdC8vIE1lcmdlIHR3byBwb3NzaWJsZSB3YXlzIG9mIHByb3ZpZGluZyBkYXRhIGludG8gdGhlIGBjb25maWcuaW5pdGlhbERhdGFgIGZpZWxkLlxyXG5cdFx0Y29uc3QgaW5pdGlhbERhdGEgPSB0aGlzLmNvbmZpZy5pbml0aWFsRGF0YSB8fCB0aGlzLmRhdGE7XHJcblxyXG5cdFx0aWYgKCBpbml0aWFsRGF0YSApIHtcclxuXHRcdFx0Ly8gRGVmaW5lIHRoZSBgY29uZmlnLmluaXRpYWxEYXRhYCBvbmx5IHdoZW4gdGhlIGluaXRpYWwgY29udGVudCBpcyBzcGVjaWZpZWQuXHJcblx0XHRcdGNvbmZpZy5pbml0aWFsRGF0YSA9IGluaXRpYWxEYXRhO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBjb25maWc7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBJbnRlZ3JhdGVzIHRoZSBlZGl0b3Igd2l0aCB0aGUgY29tcG9uZW50IGJ5IGF0dGFjaGluZyByZWxhdGVkIGV2ZW50IGxpc3RlbmVycy5cclxuXHQgKi9cclxuXHRwcml2YXRlIHNldFVwRWRpdG9yRXZlbnRzKCBlZGl0b3I6IENLRWRpdG9yNS5FZGl0b3IgKTogdm9pZCB7XHJcblx0XHRjb25zdCBtb2RlbERvY3VtZW50ID0gZWRpdG9yLm1vZGVsLmRvY3VtZW50O1xyXG5cdFx0Y29uc3Qgdmlld0RvY3VtZW50ID0gZWRpdG9yLmVkaXRpbmcudmlldy5kb2N1bWVudDtcclxuXHJcblx0XHRtb2RlbERvY3VtZW50Lm9uKCAnY2hhbmdlOmRhdGEnLCAoIGV2dDogQ0tFZGl0b3I1LkV2ZW50SW5mbzwnY2hhbmdlOmRhdGEnPiApID0+IHtcclxuXHRcdFx0dGhpcy5uZ1pvbmUucnVuKCAoKSA9PiB7XHJcblx0XHRcdFx0aWYgKCB0aGlzLmN2YU9uQ2hhbmdlICYmICF0aGlzLmlzRWRpdG9yU2V0dGluZ0RhdGEgKSB7XHJcblx0XHRcdFx0XHRjb25zdCBkYXRhID0gZWRpdG9yLmdldERhdGEoKTtcclxuXHJcblx0XHRcdFx0XHR0aGlzLmN2YU9uQ2hhbmdlKCBkYXRhICk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR0aGlzLmNoYW5nZS5lbWl0KCB7IGV2ZW50OiBldnQsIGVkaXRvciB9ICk7XHJcblx0XHRcdH0gKTtcclxuXHRcdH0gKTtcclxuXHJcblx0XHR2aWV3RG9jdW1lbnQub24oICdmb2N1cycsICggZXZ0OiBDS0VkaXRvcjUuRXZlbnRJbmZvPCdmb2N1cyc+ICkgPT4ge1xyXG5cdFx0XHR0aGlzLm5nWm9uZS5ydW4oICgpID0+IHtcclxuXHRcdFx0XHR0aGlzLmZvY3VzLmVtaXQoIHsgZXZlbnQ6IGV2dCwgZWRpdG9yIH0gKTtcclxuXHRcdFx0fSApO1xyXG5cdFx0fSApO1xyXG5cclxuXHRcdHZpZXdEb2N1bWVudC5vbiggJ2JsdXInLCAoIGV2dDogQ0tFZGl0b3I1LkV2ZW50SW5mbzwnYmx1cic+ICkgPT4ge1xyXG5cdFx0XHR0aGlzLm5nWm9uZS5ydW4oICgpID0+IHtcclxuXHRcdFx0XHRpZiAoIHRoaXMuY3ZhT25Ub3VjaGVkICkge1xyXG5cdFx0XHRcdFx0dGhpcy5jdmFPblRvdWNoZWQoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHRoaXMuYmx1ci5lbWl0KCB7IGV2ZW50OiBldnQsIGVkaXRvciB9ICk7XHJcblx0XHRcdH0gKTtcclxuXHRcdH0gKTtcclxuXHR9XHJcbn1cclxuIl19