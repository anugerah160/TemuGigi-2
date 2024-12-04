const tf = require('@tensorflow/tfjs-node');
const InputError = require('../exceptions/InputError');

async function predictClassification(model, image) {
    
    try {
        const tensor = tf.node
            .decodeImage(image)
            .resizeNearestNeighbor([224, 224])
            .expandDims()
            .toFloat();

        const prediction = model.predict(tensor);
        const score = await prediction.data();
        const confidence = score[0];

        const label = confidence > 0.5 ? 'Cancer' : 'Non-cancer';
        const suggestion = label === 'Cancer' ? 'Segera periksa ke dokter!' : 'Penyakit kanker tidak terdeteksi.';
        return { confidence, label, suggestion };
    } catch (error) {
        throw new InputError('Terjadi kesalahan input pada gambar.');
    }
}

module.exports = predictClassification;
