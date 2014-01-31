from flask import Flask, jsonify, render_template, request, send_file, send_from_directory

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.config['SERVER_NAME']="localhost:5000"
    import logging
    app.config.update(DEBUG=True,PROPAGATE_EXCEPTIONS=True,TESTING=True)
    logging.basicConfig(level=logging.DEBUG)

    app.run()