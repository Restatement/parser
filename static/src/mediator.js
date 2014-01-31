/** @jsx React.DOM */

// TODO: add checkbox to signing step certifying that the user has seen and agreed to the docs
// and reminder that signed PDFs will be e-mailed to both parties

// TODO: datepicker for hire date, dollar sign for salary
// make vesting schedule a <textarea> so konrad can describe what he wants

// TODO: send e-mail from newhire flow to employer and attorney

// TODO: get attorney info from company_setup flow

// TODO: after newhire flow, message that your attorney will e-mail the equity plan documents soon

// TODO: also update the flow state onChange? just doing it on blur isn't enough
// unless i also saveUserState onPopState

// TODO: (grellas) board consent step generates draft, e-mails attorney

var Stage = React.createClass({
    getInitialState: function() {
        return {data: []};
    },
    renderFields: function() {
        var fields = this.props.stage.fields;
        var stage = this;
        fields = fields.filter(function(field) {
            if (field.only_if) {
                var result = field.only_if.map(function(only_if_stmt) {
                    // Right now, only only_if statements of the form
                    // ['var', 'in', [<possible_values>]]
                    // are supported.
                    if (only_if_stmt.length == 3 && only_if_stmt[1] == 'in') {
                        var val = stage.props.flow.getUserStateVal(only_if_stmt[0]);
                        // See if val is present in only_if statement
                        return only_if_stmt[2].indexOf(val) != -1;
                    }
                    else {
                        return false;
                    }
                });
                return _.some(result);
            }
            else {
                return true;
            }
        });
        var fieldsUI = fields.map(function(field, i) {
            var innerUI;
            var currentVal = stage.props.flow.getUserStateVal(field.id);
            switch(field.field_type) {
                case 'choice':
                    var choices = field.options.map(function(option) {
                        return <div className="form-group">
                            <option value={option.id}>
                                    {option.name}
                            </option>
                        </div>;
                    });
                    innerUI = <select data-field-id={field.id}
                        defaultValue={currentVal}
                        className="form-control input-lg">
                        {choices}
                    </select>;
                break;

                case 'text':
                    innerUI = <input data-field-id={field.id} 
                                id={field.id} 
                                className="form-control input-lg" 
                                type="text" 
                                defaultValue={currentVal}/>;
                break;
            }
            var glossEl = "";
            if (field.gloss) {
                glossEl = <p className="help-block">
                    {field.gloss}
                </p>;
            }
            return <div className="form-group">
                    <label htmlFor={field.id}>{field.prompt}</label>
                    {glossEl}
                    {innerUI}
                </div>;
        }.bind(this));
        return (<div>
            <h2>{this.props.stage.name}</h2>
            <div>{fieldsUI}</div>
        </div>);
    },
    renderOp: function() {
        return <h3>TODO</h3>;
    },
    downloadClicked: function(e) {
        e.preventDefault();
        // Just before the form submits, insert the JSON-ified doc_vars in the
        // hidden form inputs.
        var docVarsInput = $(e.target).find('input[name="doc_vars"]').get(0);
        var stateVars = this.props.flow.getUserState();
        var flowProvides = this.props.flow.getProvides();
        console.log(flowProvides)
        // Messy, but transforms a dict of state_var->val to 
        // a list [state_var, val] to a list of [doc_var, val]
        // and finally to a dict doc_var->val.
        var docVarList = _.map(stateVars, function(state_var_val, state_var) {
            return [state_var, state_var_val]
        }).filter(function(state_tuple){
            // Check if the state_var in this tuple is exported
            return flowProvides.vars[state_tuple[0]] !== undefined;
        }).map(function(state_tuple) {
            return [flowProvides.vars[state_tuple[0]].doc_var, state_tuple[1]];
        });
        console.log(docVarList);
        var $button = $(e.target).closest('[data-doc]');
        $.ajax({
            method: 'POST',
            url: '/render',
            dataType: 'JSON',
            data: {
                'doc': $button.attr('data-doc'),
                'doc_vars': JSON.stringify(_.object(docVarList))
            },
            success: function(d) {
                console.log(d);
                // TODO: Switch in doc.filename for data-filename, and do doc_vars substitution
                var humanName = $button.attr('data-filename');
                var fname = '/file/' + d.filename + '?human_name=' + humanName;
                var downloadIFrame = $('<iframe src="' + fname + '"/>');
                downloadIFrame.hide();
                $('body').append(downloadIFrame);
                // window.open('/file/' + d.filename + '/?human_name=hi.docx');
            }
        });

        // docVarsInput.value = JSON.stringify(_.object(docVarList));
    },
    completeSignature: function(signatureRole, dataURL) {
        this.props.flow.saveSignature(signatureRole,dataURL);
    },
    renderSignPage: function() {
        var stage = this;
        var docs = this.props.stage.sign_documents.map(function(doc) {
            return <div>
                    <strong>{doc.name}</strong>
                    <div className="btn-group">
                        <button onClick={stage.downloadClicked} className="btn btn-info btn-xs">
                            <span className="glyphicon glyphicon-eye-open"></span>
                        </button>
                        <button data-doc={doc.template} data-filename={doc.template} onClick={stage.downloadClicked} className="btn btn-info btn-xs">
                            <span className="glyphicon glyphicon-download"></span>
                        </button>
                    </div>
                </div>
        });
        return <div>
            <h2>View and sign your documents</h2>
            <div>
                <span>{docs}</span>
            </div>
            <SignaturePadWidget signatureRole={this.props.stage.signature_doc_var} step={this}/>
        </div>;
    },
     render: function() {
        if (this.props.stage.fields) {
            return this.renderFields();
        }
        else if (this.props.stage.sign_documents) {
            return this.renderSignPage();
        }
        else if (this.props.stage.op) {
            return this.renderOp();
        }
    }
});

var SignaturePadWidget = React.createClass({
    getInitialState: function() {
        return {
            canvas: null,
            pad: null
        }
    },
    componentWillMount: function() {
        this.setState({
            canvas: <canvas className="signature-pad"></canvas>,
        });
    },
    componentDidMount: function() {
        this.setState({
            pad: new SignaturePad(this.state.canvas.getDOMNode())
        });
    },
    clearWidget: function(e) {
        if (this.state.pad) {
            this.state.pad.clear();
        }
        e.preventDefault();
    },
    saveClicked: function(e) {
        e.preventDefault();
        this.props.step.completeSignature(this.props.signatureRole, this.state.pad.toDataURL());
    },
    render: function() {

        return <div className="well">
                <p>Sign below.</p>
                <div>
                    <div>
                        {this.state.canvas}
                    </div>
                    <div className="btn-group">
                        <button onClick={this.clearWidget} className="btn btn-info">Clear</button>
                        <button onClick={this.saveClicked} className="btn btn-primary">Save</button>
                    </div>
                </div>
        </div>;
            // <div className="well">
            //     <p>Sign below.</p>

            // </div>;
    }
});

var Flow = React.createClass({
  getInitialState: function() {
    return {data: [], flow: null, stepIdx: 0, flow_state: {}, doc_vars: {}};
  },
  extendUserState: function(newData){
    var newState = this.state.flow_state;
    _.extend(newState, newData);
    // var fields = newData.map(function(el) {
    //     var newKey = {};
    //         newKey[$(el).attr('data-field-id')] = $(el).val();
    //         _.extend(newState, newKey);
    //     });
    this.setState({"flow_state": newState});
  },
  saveUserState: function() {
    var newState = {};
    var fields = $('[data-field-id]').get().map(function(el) {
        return [$(el).attr('data-field-id'), $(el).val()];
    });
    console.log('fields: ', fields, _.object(fields))
    this.extendUserState(_.object(fields));
    return;
  },
  saveSignature: function(signatureRole, dataURL){
    var signatureKey = '$signature:' + signatureRole;
    var updateObj = {};
    updateObj[signatureKey] = {
        dataURL: dataURL
    };
    this.extendUserState(updateObj);
  },
  getProvides: function() {
    return _.extend({},this.state.flow.provides);
  },
  getUserState: function() {
    return _.extend({}, this.state.flow_state);
  },
  getUserStateVal: function(val) {
    return this.state.flow_state[val];
  },
  setUserStateVal: function(key,val) {
    return this.state.flow_state[key] = val;
  },
    nextClicked: function(e) {
        // var flowObj = this;
        this.saveUserState();
        var nextStepId = this.state.flow.steps[this.state.stepIdx+1].step_id;
        this.navToStep(nextStepId);

        // this.setState({stepIdx:this.state.stepIdx+1}, function() {
        //     flowObj.props.mediator.navTo(flowObj.state.flow.flow_id,
        //             flowObj.state.flow.steps[flowObj.state.stepIdx].step_id);
        // });
        e.preventDefault();
    },
    navTo: function(flow_id, step_id, statePopped) {
        statePopped = statePopped || false;
        if (flow_id != this.state.flow.flow_id) {
            // TODO
            return;
        }
        var urlExt = '/' + flow_id + (step_id ? '/' + step_id : '');
        var stateObj = {
            'flow_id': flow_id,
            'step_id': step_id
        };
        console.log(stateObj);
        if (!statePopped)
            window.history.pushState(stateObj, urlExt, urlExt);
        this.changeStep(step_id);
    },
    navToStep: function(step_id, statePopped) {
        statePopped = statePopped || false;
        this.navTo(this.state.flow.flow_id, step_id, statePopped);
    },
    changeStep: function(step_id) {
        var stepObj = this.state.flow.steps.filter(function(step) {
            return step.step_id == step_id;
        })[0];
        // this.navTo(this.state.flow.flow_id, step_id);
        var stepIdx = this.state.flow.steps.indexOf(stepObj);
        this.setState({'stepIdx': stepIdx});
    },
    // navToStepIdx: function(step_idx) {

    // },
    loadFlowData: function() {
        $.ajax({
          url: this.props.url,
          dataType: 'JSON',
          success: function(data) {
            // var fs = new FlowState(data);
            this.setState({
                flow: data,
                stepIdx: 0
            }, function(){
                this.navToStep(this.state.flow.steps[0].step_id);
            }.bind(this));
          }.bind(this)
          });
    },

    componentDidMount: function() {

    },
    componentWillMount: function() {
        this.loadFlowData();
        // setInterval(this.loadFlowData, this.props.pollInterval);
    },
    isLocked: function() {
        if (this.state.flow === null) return false;
        // Right now, only sign_document steps can lock the flow
        if (!this.state.flow.steps[this.state.stepIdx].sign_documents) {
            return false;
        }
        var signatureDocVar = this.state.flow.steps[this.state.stepIdx].signature_doc_var;
        return this.state.flow_state['$signature:' + signatureDocVar] === undefined;
    },
    render: function() {
        if (!this.state.flow) return <div>Loading...</div>;
        var nextButton = <button onClick={this.nextClicked} className="btn btn-primary">Next</button>;
        var disabledNextButton = <button disabled="disabled" className="btn btn-primary">Next</button>;
        return <div>
            <form onBlur={this.saveUserState}>
            <Stage flow={this} stage={this.state.flow.steps[this.state.stepIdx]}/>
            <div>
                {this.isLocked() ? disabledNextButton : nextButton}
            </div>
            </form>
        </div>;
    }
});

var Mediator = React.createClass({
    componentDidMount: function() {
        var mediator = this;
        window.onpopstate=function(e) {
            console.log('onpopstate, state is: ', e.state);
            console.log('current_flow: ', mediator.state.currentFlow);

            if (!e.state) return;
            if (mediator.state.currentFlow) {
                mediator.state.currentFlow.navToStep(e.state.step_id, true);
            }
        };
    },
    getInitialState: function() {
        console.log('setting initial state')
        return {
            currentFlow: <Flow url={this.props.first_flow_url} mediator={this} pollInterval={2000} />
        };
    },
    render: function() {
        return this.state.currentFlow;
    }
});

var MediatorContent;
var firstFlow = $('#starter_flow').val();
if (firstFlow) {
    var firstFlowUrl = "/static/flows/" + firstFlow + '.json';
    MediatorContent = <Mediator first_flow_url={firstFlowUrl} />;
}
else {
    MediatorContent = <Mediator first_flow_url="/static/flow.json" />;
}
    

React.renderComponent(
  MediatorContent,
  $('#main_container').get(0)
);