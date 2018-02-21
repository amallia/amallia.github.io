---
title: Let's implement a Gaussian Naive Bayes classifier in Python
description: One of the simplest and effective algorithm what should be tried to solve the classification problem in s Naive Bayes classifier. It is a probabilistic method which is based on the Bayes' theorem with the naive independence assumptions between the input attributes.
tags: 
    - machine-learning
    - naive-bayes-classifier
    - algorithms
layout: post
image: /uploads/ML.jpg
---

![machine-learning]({{ site.url }}/uploads/ML.jpg){:class="img-responsive center-block"}

I finally found some time to do some machine learning. It is something I have always wanted to start practicing, as it is pretty clear that it is the future of complex problem solving.
Indeed, for some tasks, we do not have an algorithm we can write and execute, so we make it up from the data. 

> *Machine learning uses the theory of statistics in building mathematical models.*[^fnAlpaydin] - Ethem Alpaydin

A typical example of problem ML tries to solve is **classification**. It can be expressed as the ability, give some input data, to label the sample with a given class.

To make things clearer, let's make an example. Imagine we perform analysis on samples of objects and we collect their specs. Now, given this information, we would like to know if that object is a window glass (from vehicle or building) or not a window glass (containers, tableware, or headlamps). Unfortunately, we do not have a formula where we can plug these values and get an answer to our question.

Someone who has handled glasses might tell just by looking or touching it if that is a window glass or not. That is because he has acquired experience by looking at many examples of different kind of glasses. This is exactly what happens with machine learning. We say that we 'train' the algorithm to learn from known examples.

We provided a 'training set' where we specify both the input specs of the class and its category. The algorithm going through the examples learns the typical characteristics of a window glass and so he can infer the class of a given uncategorized example. 

We will use a dataset titled 'Glass Identification Database', created by B. German from Central Research Establishment Home Office Forensic Science Service.
The original dataset classified the glass into 7 classes: 4 types of window
glass classes, and 3 types of non-window glass classes.  Our version
treats all 4 types of window glass classes as one class, and all 3 types of
non-window glass classes as one class.

#### Attribute and Class Information:

Every row is an example and contains 11 attributes as listed below.

0. Example number
1. RI: refractive index
2. Na: Sodium (unit measurement: weight percent in corresponding oxide, as are attributes 4-10)
3. Mg: Magnesium
4. Al: Aluminum
5. Si: Silicon
6. K: Potassium
7. Ca: Calcium
8. Ba: Barium
9. Fe: Iron
10. Type of glass: (class)
  -- 1 window glass (from vehicle or building)
  -- 2 not window glass (containers, tableware, or headlamps)

The following is an extract of how the dataset looks like:

```json
1,1.51824,12.87,3.48,1.29,72.95,0.6,8.43,0,0,1
2,1.51832,13.33,3.34,1.54,72.14,0.56,8.99,0,0,1
3,1.51747,12.84,3.5,1.14,73.27,0.56,8.55,0,0,1
...
196,1.52315,13.44,3.34,1.23,72.38,0.6,8.83,0,0,2
197,1.51848,13.64,3.87,1.27,71.96,0.54,8.32,0,0.32,1
198,1.523,13.31,3.58,0.82,71.99,0.12,10.17,0,0.03,1
199,1.51905,13.6,3.62,1.11,72.64,0.14,8.76,0,0,1
200,1.52213,14.21,3.82,0.47,71.77,0.11,9.57,0,0,1
```

## Naive Bayes classifier

One of the simplest and effective algorithm what should be tried to solve the classification problem is Naive Bayes.
It is a probabilistic method which is based on the Bayes' theorem with the naive independence assumptions between the input attributes.

We define *C* as the class we are analyzing and *x* as the input data or observation.
The following equation, which is Bayes' theorem, is the probability of class *C*, given the observation *x*. This is equal to the fraction of the probability of class *C* (without considering at the input) multiplied by the probability of the observation given the class *C* over the probability of the observation.

*P(C)* is also called the 'prior probability' because it is the knowledge we have as to the value of *C* before looking at the observables *x*.
We also know that *P(C = 0) + P(C = 1) = 1*.

*P(x \| C)* is called the class likelihood, which is the probability that an event belonging to *C* has the associated observation value *x*.
In statistical inference, we make a decision using the information provided by a sample. In this case, we assume that the sample is drawn from some distribution that obeys a known model, for example, Gaussian.
Part of this task is to generate the Gaussian that describes our data, so we can use the probability density function to compute the probability for a given attribute [^fnNormalDistribution].
As already mentioned, every attribute will be treated as independent from the others.

Finally, *P(x)*, also called the evidence, is the probability that an observation *x* is seen, regardless of the class *C* of the example.

$$P(C|x) = \frac{P(C) \cdot P(x|C)}{P(x)}$$

The above equation is the 'posterior probability', which is the probability of class *C* after have seen the observation *x*. 

At this point, given the posterior probability of several classes, we are able to decide which one is the most likely. It is interesting to notice that the denominator would be the same for all the classes, so we can simplify the calculation by comparing only the numerator of the Bayes' theorem.

### Read data

First thing first, we want to read our dataset so we are able to perform analysis on it. It is CSV file, so we could use the `csv` Python library, but I personally prefer to use something more powerful like `pandas`.
> Pandas is an open source library providing high-performance, easy-to-use data structures and data analysis tools for the Python programming language. [^fnPandas]

`pandas.read_csv` will read our CVS file into a `DataFrame`, which is a two-dimensional tabular data structure with labeled axes. In this way, our dataset will be damn easy to manipulate. 
I also decided to label my columns so everything will be much clearer.

```python
ATTR_NAMES = ["RI", "Na", "Mg", "Al", "Si", "K", "Ca", "Ba", "Fe"]
FIELD_NAMES = ["Num"] + ATTR_NAMES + ["Class"]

data = pandas.read_csv(args.filename, names=FIELD_NAMES)
```

Now that we have our dataset in memory we want to split it into two parts: the training set and the test set. The former will be used to train our ML model, while the latter to check how accurate the model is.

The following code will split the data diving the dataset in chunks (based on the number of `blocks_num`) and choose as a test set the chunk at position `test_block` which will also be removed from the training set. 
If nothing is provided apart from the dataset, the function will just use the same data for both training and test sets.

```python
def split_data(data, blocks_num=1, test_block=0):
    blocks = numpy.array_split(data, blocks_num)
    test_set = blocks[test_block]
    if blocks_num > 1:
        del blocks[test_block]
    training_set = pandas.concat(blocks)
    return training_set, test_set
```

### Prior

Estimate the P(C) from a given training sample it is pretty straightforward. 
Prior probabilities are based on previous experience, in this case, the percentage of a class in the dataset.

We want to count the frequency of each class and get the ratio by dividing by the number of examples. The code to do so is extremely concise, also because *pandas library* makes the calculation of frequencies trivial.

```python
def __prior(self):
    counts = self.__training_set["Class"].value_counts().to_dict()
    self.__priors = {(k, v / self.__n) for k, v in counts.items()}
```

### Mean and variance

To calculate the 'pdf' (probability density function) we need to know how the distribution that describes our data looks like. To do that we need to compute the mean and the variance (or eventually the standard deviation) for each attribute for every single class.
Since we have 9 attributes and 2 classes in our dataset, we will end up having 18 mean-variance pairs.

Again for this task we can use the helper functions provided by `pandas`, where we select the column of interest and call on that `mean()` and `std()`.

```python
def __calculate_mean_variance(self):
    self.__mean_variance = {}
    for c in self.__training_set["Class"].unique():
        filtered_set = self.__training_set[
            (self.__training_set['Class'] == c)]
        m_v = {}
        for attr_name in ATTR_NAMES:
            m_v[attr_name] = []
            m_v[attr_name].append(filtered_set[attr_name].mean())
            m_v[attr_name].append(
                math.pow(filtered_set[attr_name].std(), 2))
        self.__mean_variance[c] = m_v
```

### Gaussian Probability Density Function

The function to compute the 'pdf' is just a static method that takes as input the value of the attribute and the description of the Gaussian (mean and variance) and returns a probability according to the 'pdf' equation.  

```python
@staticmethod
def __calculate_probability(x, mean, variance):
    exponent = math.exp(-(math.pow(x - mean, 2) / (2 * variance)))
    return (1 / (math.sqrt(2 * math.pi * variance))) * exponent
```

### Predict

Now that we have everything in place, it is time to predict our classes.

Basically, what the following does, it is iterating through the test set and for each sample calculate the probability of every class using the Bayes' theorem. The only difference here is that we use *log probabilities* since the probabilities for each class given an attribute value are small and they could underflow. 

So it becomes:
$$\log[p(x|C) ∗ P(C)] = \log P(C) + \sum_{i=1}^9 \log p(x i |C)$$

```python
def predict(self):
    predictions = {}
    for _, row in self.__test_set.iterrows():
        results = {}
        for k, v in self.__priors:
            p = 0
            for attr_name in ATTR_NAMES:
                prob = self.__calculate_probability(row[attr_name], self.__mean_variance[
                    k][attr_name][0], self.__mean_variance[k][attr_name][1])
                if prob > 0:
                    p += math.log(prob)
            results[k] = math.log(v) + p
        predictions[int(row["Num"])] = max([key for key in results.keys() if results[
            key] == results[max(results, key=results.get)]])
    return predictions
```

As a result, we need to take as a prediction the class with the highest probability. If two or more classes end up having the same probability we decided to take the classes with the greatest value, but this was not really needed for the given dataset.

### Accuracy

Once we obtain the predictions, we can compare them to the class value present in the test dataset, so we can calculate the ratio of correct ones over the total number of predictions. This measure is also called accuracy and allows to estimate the quality of the ML model used.

```python
def calculate_accuracy(test_set, predictions):
    correct = 0
    for _, t in test_set.iterrows():
        if t["Class"] == predictions[t["Num"]]:
            correct += 1
    return (correct / len(test_set)) * 100.0
```

In our tests, we obtained a 90% accuracy using the same dataset for both training and test.

## Cross validation

Know that we know how to perform a prediction, let's look at the data again. Does it really mean any sense to train an algorithm on something and then test it on the same data? Probably not.
We want to have two different sets then, but this is not always possible when you do not have enough data.

Our example dataset contains 200 records, ideally, we would like to optimize it as much as we can and perform a test on the all 200 samples, but then we would not have anything to use to train the model.

The way ML people do this is called *cross validation*. The dataset is divided into chunks (as shown before), say 5 for example, and the model is trained against 4 of 5 chucks and the other chuck is used for the test. This operation is repeated as many times as the number of chunks so that the test is performed on every chunk.
Finally, the accuracy values collected for every repetition is averaged.

Again, even using 5-fold cross validation we obtained the same accuracy equal to 90%.

## Zero-R classifier

Zero-R classifier simply predicts the majority class (the class that is most frequent in the training set).
Sometimes a not-very-intelligent learning algorithm can achieve high accuracy on a particular learning task simply because the task is easy. For example, it can achieve high accuracy in a 2-class problem if the dataset is very imbalanced.

Running a Zero-R classifier on our dataset just as a comparison with Naive Bayes, we have obtained 74.5% accuracy.

Here the trivial implementation:
```python
class zero_r_classifier(object):
    def __init__(self, training_set, test_set):
        self.__test_set = test_set
        classes = training_set["Class"].value_counts().to_dict()
        self.__most_freq_class = max(classes, key=classes.get)

    def predict(self):
        predictions = {}
        for _, row in self.__test_set.iterrows():
            predictions[int(row["Num"])] = self.__most_freq_class
        return predictions
```

Comparing the Zero-R classifier accuracy with the Naive Bayes one we realized that our model is pretty accurate when compared to simplistic ones. Indeed, Zero-R only achieves a 74.5% accuracy.

## Popular implementation

One of the most popular library in Python which implements several ML algorithms such as classification, regression and clustering is scikit-learn.
This library as also a Gaussian Naive Bayes classifier implementation and its API is fairly easy to adopt. You can find the documentation and some examples here: [http://scikit-learn.org/.../sklearn.naive_bayes.GaussianNB.html](http://scikit-learn.org/stable/modules/generated/sklearn.naive_bayes.GaussianNB.html)

This implementation is definitely not production ready, even it obtains the same predictions of scikit-learn since what is actually happening under the hood is the same.
On the other hand, it has not been engineered too much as its scope was only to play with Naive Bayes. Anyway, most of the time looking at a simple implementation might be easier and more effective. You can find the whole source code and the dataset used here: [https://github.com/amallia/GaussianNB](https://github.com/amallia/GaussianNB)


## References
[^fnAlpaydin]: Ethem Alpaydin. 2014. Introduction to Machine Learning. The MIT Press.
[^fnNormalDistribution]: [https://en.wikipedia.org/wiki/Normal_distribution](https://en.wikipedia.org/wiki/Normal_distribution)
[^fnPandas]: [https://pandas.pydata.org/](https://pandas.pydata.org/)

