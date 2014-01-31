/** @jsx React.DOM */

/*

Key insight: parse document line-by-line when nothing else matches. flag errors as being per-line, and have them
attempt to resume normal parser state at the beginning of each new line.
*/

var ParserInterface = React.createClass({
    getInitialState: function() {
        return {
            'text_container': <TextContainer parser={this.props.parser}/>,
            'sidebar': <Sidebar parser={this.props.parser}/>
        };
    },
    componentDidMount: function() {
        $.get('/static/docs/perferred stock agreement.md', function(result) {
            console.log(result);
            this.props.parser.load_text(result);

        }.bind(this));
    },
    render: function() {
        return <div>
        <div className="col-md-10">
            {this.state.text_container}
        </div>
        <div className="col-md-2">
            {this.state.sidebar}
        </div>
        </div>;
    }
});

var Parser = React.createClass({
    getInitialState: function() {
        return {
            parser: null,
            parser_output: "",
            rules: [
                
                {
                    rule_name: "body",
                    rules: ['line+']
                },
                {
                    rule_name: "line",
                    rules: [
                        "text newlines /",
                       "lastline:text"
                    ]
                },
                {
                    rule_name: "newlines",
                    rules: ['"\\n"+ {return "";}']
                },
                {
                    rule_name: "text",
                    rules: ['chars:[^\\n]+ {return chars.join("").trim(); }']
                }
            ]
        };
    },
    do_parse: function(text) {
        var parser = PEG.buildParser(this.generate_peg());
        this.setState({
            parser_output: parser.parse(text)
        });
    },
    get_parser_output: function() {
        console.log(this);
        if (!this.state) return "";
        return this.state.parser_output;
    },
    generate_peg: function() {
        return this.state.rules.map(function(rule) {
            return rule.rule_name + ' = ' + rule.rules.join("\n");
        }).join("\n");
    },
    render: function() {
        return <div>
        <div>
            Rules:
            <select>
                {this.state.rules.map(function(rule) {
                    return <option>{rule.rule_name}</option>;
                })}
            </select>
            <button className="btn btn-default">Add rule</button>
        </div>
        </div>;
    }
});

var Sidebar = React.createClass({
    getInitialState: function() {
        return {
            'parse_status': 'success'
        };
    },
    parse_btn: function() {
        this.props.parser.do_parse();
    },
    render: function() {
        var parse_button = (function() {
             if (this.state.parse_status == 'success') {
                return <button onClick={this.parse_btn} className="btn btn-primary">Parse OK</button>
             }
             else if (this.state.parse_status == 'ongoing') {
                return <button onClick={this.parse_btn} className="btn btn-default" disabled="disabled">Parsing...</button>;
             }
             else if (this.state.parse_status == 'error') {
                return <button onClick={this.parse_btn} className="btn btn-danger">Error</button>;
             }
        }.bind(this))();
        return <div className="sidebar-panel">
                <div>
                    {parse_button}
                </div>
                {this.props.parser}
            </div>;
    }
});

var TextContainer = React.createClass({
    componentDidMount: function() {

    },
    getInitialState: function() {
        return {
            'text_nodes': []
        };
    },
    get_text_blob: function() {
        return this.state.text_nodes.map(function(node) {
            return node.state.node_text;
        }).join('\n');
    },
    // load_text: function(text) {
    //     var text_state = [];
    //     var lines = text.split("\n");
    //     for (var line_idx = 0; line_idx < lines.length; line_idx++) {
    //         text_state.push(<TextNode node_type="line" node_text={lines[line_idx]}/>);
    //     }
    //     // text_state.push(<TextNode node_type="text_blob" node_text={text}/>);
    //     this.setState({
    //         'text_nodes': text_state
    //     });
    // },
    // renderBody: function() {
    //     var body_container = this.state.text_nodes.map(function(node) {

    //     })
    //     var container = <div></div>;  
    // },
    render: function() {
        return <div>{this.props.parser.get_parser_output()}</div>;
        return <div className="text-containter">
                {this.state.text_nodes}
            </div>;
    }
});

var TextNode = React.createClass({
    emit_parsable_text: function() {
        if (this.props.node_type == 'line') {
            return this.props.node_text + "\n";
        }
    },
    render: function() {
        if (this.props.node_type == 'line') {
            return <p>{this.props.node_text}</p>;
        }
        return <br/>;
    }
});

React.renderComponent(
  <ParserInterface parser={<Parser/>}/>,
  $('#main_container').get(0)
);